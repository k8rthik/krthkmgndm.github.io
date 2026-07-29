---
title: "bgelo: an elo engine for board game night"
date: "2026-07-25"
description: "How the pod's board game ratings work — pairwise Glicko over BG Stats exports, and the iterations it took to get there"
slug: "bgelo"
time: 7
active: 1
---

My friends and I log every board game we play in [BG Stats](https://www.bgstatsapp.com/). Once you have a few hundred plays on record, the obvious question is: who's actually good? Win counts don't answer it — beating four newbies at CATAN and beating four veterans at Brass are not the same achievement. So I built bgelo, a rating engine that turns the raw export into the [ratings dashboard](/bgelo) on this site. This post is about how it works and the iterations it took to stop being wrong in embarrassing ways.

# Multiplayer is the first problem

Elo is defined for two players. Board game night is four to six. The standard trick, which bgelo uses, is to decompose every n-player game into all pairwise matchups: if you finish 2nd of 5, you beat three people and lost to one, and each of those pairs gets scored like a tiny two-player game. Each pair carries weight 1/(n−1) so a six-player game doesn't move your rating three times as much as a duel.

Finishing order comes from a normalization cascade: explicit ranks if the play has them, then numeric scores (highest wins, winner flag breaking ties), then the winner flag against a tied field. Scores people typed as arithmetic like `1914-100` get evaluated by an AST-whitelisted evaluator — never `eval`. Anything that can't be normalized, or contradicts itself, is rejected with a reason rather than guessed at.

# Iteration one: fixed-K Elo, and why it died

The first version was classic Elo with a fixed K-factor, plus a hand-rolled "provisional" accelerator so new players could converge faster. It worked, roughly, but it had two problems that kept showing up in real standings.

First, the provisional hack was ad hoc: I was inventing K schedules with no principled way to decide when a player stopped being provisional. Second, a two-play player with a hot streak would sit at the top of the leaderboard looking exactly as credible as someone with sixty plays, and nothing in the system could say otherwise.

The fix was moving to **Glicko-1**, which is Elo plus an explicit uncertainty. Every rating carries a deviation σ. Your own σ sets how fast you move (new players converge quickly, established ones are stable — the provisional accelerator, but derived instead of invented). An opponent's σ discounts the evidence their result carries, so beating a total unknown proves little. And σ shrinks by exactly the information each play contained, which means the confidence interval shown and the update dynamics are one mechanism, not two systems glued together. σ also widens with calendar inactivity, so someone who vanishes for six months drifts back toward "unknown."

# Iteration two: not all games are equal

Raw Glicko still treats a round of Anomia like a three-hour game of Indonesia. The pod objected. Each pairwise update is now scaled by a product of context weights:

**W, game weight (0.5–1.5).** A blend of 35% BGG community complexity and 65% curated *skill intensity* — how decision-driven the outcome is. Keeping those axes separate matters: Diplomacy is mid-weight on BGG but near-pure skill; CATAN is as "heavy" as Dominion but dice-dominated. The skill numbers are hand-curated with a written rationale per game, because no API knows how lucky a game feels.

**C, table confidence (0.2–1.0).** Per-player familiarity with the game, seeded from BG Stats' new-player flags. An all-newbie table is noise; an expert stomping a first-timer proves little. Both get dampened. Tables of experienced players count nearly full.

**D, duration (√(minutes/60), capped at 1).** A 10-minute filler moves ratings about a third as much as a 2-hour game. The cap means marathons earn no bonus — TI4 is long, not extra-informative per pair.

**Margin of victory (0.8–1.2).** Score gaps, normalized by that game's own typical score spread (a walk-forward standard deviation, so a game's early plays don't peek at later ones). A 20-point rout in CATAN and a 20-point rounding error in Indonesia are different animals.

# Iteration three: let the backtest decide

Every one of those knobs is a chance to fool myself, so the engine has a calibration harness: replay the entire history walk-forward, produce a win probability for every pairwise matchup using only pre-play information, and score those predictions with log loss and Brier against what actually happened. A grid search sweeps the parameters and, more importantly, ablates whole mechanisms — game weight off, confidence off, margin off — to see what actually earns its complexity.

Some findings that shaped the current defaults:

- An aggressive margin multiplier (0.6–1.4) backtested *worse* than no margin at all — score gaps are noisier than they feel. The gentle 0.8–1.2 version at 3 game-SDs is prediction-neutral, and it stays because it makes updates feel fairer at the table, not because it predicts better.
- The duration factor is also backtest-neutral. Same story: kept for fairness, not accuracy.
- The current defaults call 62.5% of decisive pairwise matchups correctly, against a 50% coin-flip baseline. For a domain this dice-soaked, I'll take it.

There's also a sanity suite — six empirical checks (calibration, discrimination, convergence, plus tests that the confidence and game-weight premises actually hold in our data) wired into the test suite. If a future export breaks a modeling assumption, tests fail and the assumption gets revisited instead of silently degrading.

# What comes out

The engine emits one JSON blob: rating trajectories over cumulative table-hours, per-player expected vs. actual win shares, per-game weights, head-to-head records. The [bgelo](/bgelo) page renders it. Ratings are relative — 1000 means "average newcomer" — and the clock only advances on rated plays, so rejected logs contribute nothing.

The main lesson, if there is one: every mechanism I added because it *felt* right got humbled by the backtest, and the two that survived on vibes alone (margin, duration) only get to stay because they're provably harmless. Rating your friends is a surprisingly good forcing function for statistical honesty — nobody audits a model harder than the guy it says is losing.
