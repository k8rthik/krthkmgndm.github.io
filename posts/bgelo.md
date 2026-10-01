---
title: "bgelo: an elo engine for board game night"
date: "2026-08-03"
description: "A component-by-component walkthrough of the pod's rating engine — pairwise Glicko-1, context weights, calibration, and every custom decision in between"
slug: "bgelo"
time: 15
active: 1
---

My friends and I log every board game we play in [BG Stats](https://www.bgstatsapp.com/). We're also a group of stats nerds who love to compete. The obvious result was going to be a totally-accurate, statistically-backed ranking system between us (with a much too small sample size). Naturally, I built bgelo, a rating engine that turns our raw logs into the ratings you can see [here](/bgelo).

# The pipeline at a glance

```
BG Stats app (phone)
      │  JSON export
      ▼
refresh.py ── ingest export, back up the previous one
      │
      ├──▶ BGG API ──▶ community complexity weights
      │               (cached in data/bgg_weights.json)
      ▼
engine.py ── one chronological pass over every play
      │
      │  per play:
      │   ranking.py     seats → finishing order (or reject)
      │   profiles.py    game weight W (BGG × curated skill)
      │   experience.py  familiarity → table confidence C
      │   scorebook.py   walk-forward score spread → margin G
      │   glicko.py      pairwise Glicko-1 update, × W·C·G·D
      │   uncertainty.py sigma aging between a player's plays
      ▼
stats.py ── per-play history + career summaries
      │
      ├──▶ sanity.py    six model-assumption checks
      ├──▶ calibrate.py walk-forward backtest & grid search
      ▼
viz.py ── dashboard payload (series, events, playLog, …)
      │
      ▼
site_sync.py ──▶ data/elo.json ──▶ keerthik.dev/bgelo
```

# The rating core: pairwise Glicko-1

Elo is defined for two players; board game night is four to six. The standard decomposition, which bgelo uses, treats every n-player play as all C(n,2) pairwise matchups: finish 2nd of 5 and you beat three people and lost to one, each pair scored like a tiny two-player game. Every pair carries a base weight of 1/(n−1) so a six-player game doesn't move your rating three times as much as a duel.

The first version of the updater was classic fixed-K Elo with a hand-rolled "provisional" accelerator for new players. It died for two reasons: the accelerator was ad hoc (no principled way to say when someone stops being provisional), and a 2-play hot-streaker looked exactly as credible on the leaderboard as a 60-play veteran. **Glicko-1** fixes both by making uncertainty a first-class quantity. Every rating carries a deviation σ, and three things fall out of one mechanism:

- **Your σ sets your speed.** New players (σ = 180 prior) converge fast; established players (σ floored at 40 — never claim more precision than that) are stable. The provisional accelerator, derived instead of invented.
- **Your opponent's σ discounts their evidence** via the g-factor: beating a total unknown proves little, and the update knows it.
- **σ shrinks by exactly the information the play carried**, so the confidence interval on the dashboard (± 1.645σ, a 90% interval) and the update dynamics are one system, not two glued together.

The per-pair update is textbook Glicko-1 with one addition — each pair's weight folds in the engine's context multipliers:

```
w = W(game) · C(table) · G(margin) · D(duration) / (n − 1)
```

Let me explain how each component is calculated.

# W — game weight

Not all games are equally skill-testing. The results from a casual game of Anomia should not move ratings like three hours of Indonesia. Therefore, each game gets a multiplier in 0.5–1.5 built from two axes:

- **Complexity**: the BGG community weight (1–5) is a popular community method of measuring rules overhead and strategic depth.
- **Skill intensity**: 0–1, this is a hand-curated rating that attempts to attribute the amount of variance codified by the game rules. For example, a game like Terra Mystica has zero variance after setup, while a streak of lucky rolls can make or break a game of Catan.

The weight is 35% normalized complexity, 65% skill intensity. This is primarily to correct for games with low rules overhead but high strategic depth. Diplomacy is mid-weight on BGG but nearly pure skill (both tactically and politically); CATAN is as "heavy" as Dominion but dice-dominated.

# C — table confidence

We can only trust the game results to reflect skill level once players have a chance to familiarize themselves with the rules systems and create intentional strategy decisions. It is very difficult to compare two strategic decisions on the first few plays of a new board game, so I indexed familiarity as a saturating curve on prior plays of *that game*: f = n/(n+2). Two subtleties:

- **Seeding.** BG Stats flags a player's first-ever play of a game. If someone's first *logged* play isn't flagged new, they had unlogged history, so they're seeded with 2 prior plays instead of 0.
- **The table aggregate** starts from the mean familiarity (base 0.35 + 0.65·mean), then applies a *spread penalty* (−35% at maximal spread). A veteran pubstomping a first-timer proves nothing of their overall skill, just their familiarity with the rules system.

An all-newbie table is dominated by noise, while an all-veteran table is where results mean something. Both the update *and* the σ shrink scale with C, so low-confidence games neither move you much nor make the system more sure of you.

# G — margin of victory

A 6-point win is a brutal victory in Twilight Imperium and a rounding error in Indonesia, so raw score gaps are meaningless across games. The intuition would be that scores must be normalized per game.

The scorebook keeps running walk-forward per-game score statistics (Welford's algorithm). This distribution isn't trusted until 6 scores across 2 distinct plays exist as a baseline and a pair's gap is normalized by that game's typical spread, with 3 game-SDs earning the full multiplier.

The span is deliberately gentle: 0.8–1.2. The first version was 0.6–1.4 and the backtest said it made predictions *worse* — score gaps are noisier than they feel. The gentle version is prediction-neutral, and it stays for a non-statistical reason: it makes updates feel fairer at the table. That trade is allowed exactly because it's provably harmless.

# D — duration

D = √(minutes/60), capped at 1.0. A 10-minute filler moves ratings about a third as much as an hour-long game; the cap means marathons earn no bonus — TI4 is long, not extra-informative *per pair*. When a play has no logged duration, the game's BGG min/max playtime average stands in (and the play is flagged as estimated). Also backtest-neutral, also kept for fairness.

# Time, absence, and the clock

Two different clocks run through the engine:

- **The rating timeline is cumulative rated table-hours**, not calendar time. The dashboard's x-axis advances only when rated plays happen — rejected plays advance nothing. An hour of Brass and an hour of Anomia move the clock equally; what they *do* with that hour differs via the weights.
- **Uncertainty ages on calendar days.** Between a player's plays, σ² grows by 10 per idle day, capped back at the prior of 180 — vanish for six months and you're statistically a stranger again. The growth rate was backtested, not vibed: 0, 50, and 100 per day all scored worse.

# Keeping it honest: calibration

Every knob above is a chance to fool myself, so the engine's core discipline is a walk-forward backtest. Replaying history chronologically, every rated play emits a pre-play win probability for each pairwise matchup — using only information available before that play. Those forecasts get scored against what happened with log loss and Brier (coin-flip baseline: 0.693). A grid search sweeps the numeric knobs and, more importantly, **ablates whole mechanisms** — game weight off, confidence off, margin off — to see what actually earns its complexity.

Findings that shaped the defaults:

- Aggressive margin (0.6–1.4) predicted worse than no margin at all. Gentle margin is neutral; kept for table-feel.
- Duration weighting is neutral; kept for table-feel.
- The confidence and game-weight mechanisms earn their keep — and their *premises* are tested directly (below).
- Current defaults call 62.5% of decisive pairwise matchups correctly against the 50% baseline. For a domain this dice-soaked, I'll take it.

One methodological detail from the anonymous-player change: guest pairings update ratings but are *excluded* from the calibration score, which only ever grades the model on persistent identities. Predicting a coin-flip against someone the model is designed to know nothing about would be noise in both directions.

# Keeping it honest: the sanity suite

Calibration says the parameters predict well *now*; the sanity suite checks whether the model's assumptions hold in this pod's actual data, and it runs inside the test suite so a new export that breaks an assumption fails CI instead of silently degrading:

1. **Calibration** — when the model says 70%, does the favorite win about 70%?
2. **Discrimination** — do bigger rating gaps predict outcomes better than small ones?
3. **Convergence** — do per-play rating moves shrink as evidence accumulates?
4. **Confidence premise** — are high-C tables actually more predictable? (Validates C.)
5. **Weight premise** — are high-W games actually more predictable? (Validates W.)
6. **Retrodiction** — does final rating order agree with season win share among the regulars?

Numbers 4 and 5 are the interesting ones: they don't test the code, they test the *belief* the code encodes. If skill-intensity curation were fantasy, check 5 is where it would show.

# From engine to dashboard

The engine emits one JSON payload: per-player rating series over the playtime axis, per-play events with every seat's delta/rank/deviation, session summaries, head-to-head records among the regulars, per-game profiles, and the all-plays `playLog`. `site_sync` copies it into this site's repo as `data/elo.json` — the one file the site never edits by hand — and the [dashboard](/bgelo) renders it.

The site has its own discipline layer: all display numbers are derived from the payload by pure, tested functions (as-of-date filtering, records, the games table), and a data-invariants test suite runs against the real payload on every push — series must reconcile with per-seat deltas, ranks must start at 1, the playLog must mirror rated events one-for-one. When an export change breaks a site assumption, a test names it before the page renders it wrong.

# The decisions ledger

Compressed, every custom decision currently in the engine:

- Pairwise decomposition, 1/(n−1) base weight; ties score 0.5.
- Rank cascade: explicit ranks → scores (AST-evaluated expressions) → winner flag; contradictions flag or reject, never guess.
- Ignored plays: counted in `playLog`, never rated.
- Anonymous seats: rated as fresh (1000, σ=180) guests, never persisted, excluded from calibration and records.
- Glicko-1 with σ prior 180, floor 40; 90% intervals at ±1.645σ.
- σ² ages +10/idle calendar day, capped at prior (backtested).
- W: 0.5 + 0.35·BGG-complexity + 0.65·curated skill intensity, each curation with a written rationale.
- C: familiarity n/(n+2), unlogged-history seed of 2, mean-based with spread penalty, clamped 0.2–1.0.
- G: 0.8–1.2 across 3 walk-forward game-SDs; trusted only after 6 scores / 2 plays.
- D: √(min/60) capped at 1; estimated durations flagged.
- Clock: rated table-hours; rejected plays advance nothing.
- Everything above sweepable and ablatable; two mechanisms (G, D) survive on fairness with proof of harmlessness rather than predictive value.

The main lesson hasn't changed since the first version of this post: every mechanism I added because it *felt* right got humbled by the backtest, and the ones that survived on vibes alone only get to stay because they're provably harmless. Rating your friends is a surprisingly good forcing function for statistical honesty — nobody audits a model harder than the guy it says is losing.
