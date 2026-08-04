---
title: "bgelo: an elo engine for board game night"
date: "2026-08-03"
description: "A component-by-component walkthrough of the pod's rating engine — pairwise Glicko-1, context weights, calibration, and every custom decision in between"
slug: "bgelo"
time: 15
active: 1
---

My friends and I log every board game we play in [BG Stats](https://www.bgstatsapp.com/). Once you have a hundred plays on record, the obvious question is: who's actually good? Win counts don't answer it — beating four newbies at CATAN and beating four veterans at Brass are not the same achievement. So I built bgelo, a rating engine that turns the raw export into the [ratings dashboard](/bgelo) on this site.

This post walks the whole machine, component by component: what each piece does, the methodology behind it, and the custom decisions baked into every layer. Nothing here is hand-waved — every constant mentioned is the one in the code.

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

One command (`python3 -m bgelo.refresh`) runs the top two-thirds; `site_sync` ships the payload to this site as a single committed file. The engine is a pure chronological replay — no state survives outside the pass — which is what makes the calibration story later possible.

# Normalizing a play

Before anything can be rated, a play has to become a finishing order. BG Stats gives you three unreliable, overlapping signals — explicit ranks, numeric scores, and a winner flag — and real logs use every combination of them. The normalization cascade:

1. **Explicit ranks**, if every seat has one. The winner flag is checked against them; if someone is flagged winner but not ranked best, the play is *flagged* for review (ranks drive the rating, flags drive win credit) rather than silently resolved.
2. **Numeric scores** otherwise — highest wins, winner flag breaking exact ties. Scores people typed as arithmetic like `1914-100` are evaluated by an AST-whitelisted evaluator, never `eval`. If the flagged winner contradicts the scores, the play is rejected outright.
3. **Winner flag alone** as the last resort: winner rank 1, everyone else tied at 2. Weak signal, but honest — a 5-player "I won, don't remember the scores" play still says one true thing.

Anything that can't be normalized — no ranks, no scores, no winner — is rejected with a written reason, not guessed at. Ties are handled with standard competition ranking throughout, and a tie scores 0.5 in the pairwise decomposition below.

# Who gets rated

Two identity decisions took actual iteration to get right.

**Ignored plays.** A play marked *ignored* in BG Stats (a botched teach, an abandoned game) is excluded from rating — but it still happened. The export ships a `playLog` of every logged play alongside the rated events, so the dashboard's games table counts all plays and hours while the ratings only trust clean ones. Play counts match the app; ratings don't get polluted.

**Anonymous players.** The lazy approach — drop the anonymous seat and renormalize ranks — turns out to be a methodology error. In pairwise decomposition, dropping a seat deletes n−1 real comparisons, and worse, it rewrites your record: finish 3rd of 4 behind an anonymous player and the drop promotes you to 2nd of 3, with the loss to the guest erased. The engine now keeps anonymous seats in the decomposition as a **fresh unknown guest**: rating 1000, deviation at the full prior (σ = 180), every single appearance — because the catch-all identity is a different human each time. Losing to a guest costs you, beating one earns a little, and Glicko's g-factor automatically discounts how much a maximum-uncertainty opponent can prove. Nothing about the guest persists: no rating, no leaderboard row, no rating line, and they're barred from the swing records (a fresh 1000 with prior sigma moves fast, and a guest should not hold "biggest gain").

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

Those four multipliers are the next four components.

# W — game weight

Not all games are equal evidence. A round of Anomia should not move ratings like three hours of Indonesia. Each game gets a multiplier in 0.5–1.5 built from two deliberately separate axes:

- **Complexity**: the BGG community weight (1–5), fetched once per game from the BGG API and cached. Measures rules overhead and strategic depth.
- **Skill intensity**: 0–1, hand-curated per game — how much the *outcome* is decided by player decisions versus luck. Every entry carries a written rationale in the source ("Brass — near-deterministic economic engine; only card-draw variance: 0.88", "CATAN — dice-roll income dominates: 0.35", "Megaland — push-your-luck dice, mostly variance: 0.30").

The blend is 35% normalized complexity, 65% skill intensity, mapped onto 0.5 + blend. Keeping the axes separate is the point: Diplomacy is mid-weight on BGG but nearly pure skill (0.90); CATAN is as "heavy" as Dominion but dice-dominated. No API knows how lucky a game feels — that number has to be curated, and the backtest later gets to veto the curation.

# C — table confidence

A result only reflects skill if the people at the table knew what they were doing. Familiarity is a saturating curve on prior plays of *that game*: f = n/(n+2), so 0 plays → 0, 2 plays → 0.5, 8 plays → 0.8. Two subtleties:

- **Seeding.** BG Stats flags a player's first-ever play of a game. If someone's first *logged* play isn't flagged new, they had unlogged history, so they're seeded with 2 prior plays instead of 0.
- **The table aggregate** starts from the mean familiarity (base 0.35 + 0.65·mean), then applies a *spread penalty* (−35% at maximal spread): an expert stomping a first-timer proves nearly as little as an all-newbie table, just for a different reason. The result clamps to 0.2–1.0.

An all-newbie table is rules-fumbling noise; an all-veteran table is where results mean something. Both the update *and* the σ shrink scale with C, so low-confidence games neither move you much nor make the system more sure of you.

# G — margin of victory

A 20-point win is a rout in CATAN and a rounding error in Indonesia, so raw score gaps are meaningless across games. The scorebook keeps running per-game score statistics (Welford's algorithm), **strictly walk-forward** — a play is only ever judged against scores from *earlier* plays, and the distribution isn't trusted until 6 scores across 2 distinct plays exist. A pair's gap is normalized by that game's typical spread, with 3 game-SDs earning the full multiplier.

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
