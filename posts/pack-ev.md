---
title: "pack ev: is a magic pack worth more opened?"
date: "2026-10-09"
description: "Pricing every card a booster can contain across 39 sets and five years of TCGplayer history, and what that says about when opening beats keeping a pack sealed"
slug: "pack-ev"
time: 9
active: 1
---

Every Magic booster poses the same choice: open it, or sell it sealed. Opening gets you cards to sell one by one; keeping it gets you whatever the next buyer pays for an unopened pack. A pack's *expected value* (EV) says which is worth more. Sum, over every card the pack could contain, the chance of pulling that card times its price, then compare the total to the sealed price.

I built [pack-ev](https://github.com/k8rthik/pack-ev) to compute that for every booster sold since mid-2021: 39 sets and 94 booster products, priced weekly from a week after release to today. The [dashboard](/packev) has the numbers; this post covers how they're made and what they show.

# What's in a pack

Wizards of the Coast publishes a "Collecting" article for each set that lists every slot of every booster with its odds. The rare slot of a Lorwyn Eclipsed Play Booster, for example, holds a rare 78.2% of the time, a mythic 13.6%, a fable frame rare 4.6%, and so on down to borderless cards listed only as "less than 1%". The odds are given per group of cards, not per card, so the model treats every card within a group (say, the 26 rare fable frame cards) as equally likely.

Each set is a small TOML file that turns its article into card pools and slot odds. Pools are selected from [Scryfall](https://scryfall.com) by collector number, frame treatment and rarity, and every pool size the article states is checked: if WOTC says there are 81 commons and the filter finds 80, the set fails validation instead of quietly skewing the EV. Sets from 2024 on have fully published odds. For older Draft and Set Boosters WOTC published only a handful of rates, so [MTGJSON](https://mtgjson.com)'s estimated booster sheets fill the gaps, and WOTC's number wins wherever both exist.

Transcribing 39 articles turned up a few errors on WOTC's side. The Hobbit and Marvel's Spider-Man both list their Play Booster wildcard as about 74% common and 4% uncommon, almost certainly the two numbers swapped. I kept the published figures: commons and uncommons are both bulk, so the swap moves EV by cents.

One exclusion is deliberate. One-off chase cards whose odds are given only as "less than 1% of packs" (serialized cards, headliners, the raised-foil Avatar Aang) are left out, because any rate assigned to them is a guess and the guess dominates the result. Read "<1%" as 0.1% and the $4,800 Aang adds $4.80 to every Avatar Collector Booster's EV; read it as 1% and it adds $48.

# Every combination at once

EV is a single weighted sum, and it hides the shape of the outcome. The more useful view lines up every possible pack from worst to best and asks where the sealed price falls. A Collector Booster has on the order of 10^30 possible contents, far too many to list. If the slots are independent, though, the distribution of a pack's total value is the convolution of each slot's distribution, and on a one-cent grid a few FFTs compute it exactly.

That distribution shows how misleading EV is on its own. A Lorwyn Eclipsed Play Booster has an EV of $5.56 against a $4.77 price, which looks like a good trade. But the median pack is worth $3.27, and 73% of packs are worth less than they cost. The EV is held up by the occasional $20 rare and a thin tail that reaches $155. Open one pack and you will probably lose. A box narrows the spread, but the skew remains, so a typical box still lands somewhat below EV.

# Prices over time

Current prices come from [TCGCSV](https://tcgcsv.com), which mirrors TCGplayer's API daily. History was harder. TCGCSV's daily archive has gone offline, so weekly history comes from the endpoint behind TCGplayer's own product price charts. Its data starts on June 14, 2021, which is why the analysis starts with Modern Horizons 2.

That endpoint is not a public API. My first pass hit it at 10 requests a second and was refused after about 1,400. The fetcher now runs at 2 a second, with a circuit breaker that pauses every worker once refusals start. It fetches each product's full history once into a Parquet store, and from then on appends only the current week from TCGCSV, a handful of requests per set instead of one per card. Before relying on that switch I checked that the two sources agree: on 35,653 overlapping prices they matched exactly 70–83% of the time and came within 10% 98–99% of the time. A weekly refresh of all 39 sets takes about five minutes.

Cheap cards are sampled rather than fetched. The cards that make up the top 98% of a booster's EV each get their own history. The rest are grouped by pool and current price band; eight cards per group are fetched, and the others follow that sample's median weekly price movement, scaled to their own current price. Against two sets fetched in full, sampling's worst weekly EV error is under 0.1%.

# What the data says

Align every booster on weeks since release and each product type's life cycle comes into focus. "Beats sealed" means the pack's EV at TCGplayer market prices exceeds that week's sealed price. Each column counts only boosters old enough to have reached that age, so the two-year column covers 25 of the 39 Play and Draft Boosters and 26 of the 40 Collector Boosters.

| booster type | launch | 3 months | 1 year | 2 years |
|---|---|---|---|---|
| Set Boosters (15) | 80% | 100% | 87% | 80% |
| Play / Draft Boosters (39) | 56% | 62% | 72% | 52% |
| Collector Boosters (40) | 48% | 11% | 18% | 12% |

**Collector Boosters are a coin flip at launch and a bad trade after.** In release week about half of them beat sealed. Three months later it's about one in ten, and by year two the median Collector Booster's contents are worth 76% of its sealed price. Today, across all 40, the median is 57%. The worst ratios belong to the most collectible products: a Phyrexia: All Will Be One Collector Booster sells for $109.69 and its contents are worth $25.85; a Lord of the Rings one sells for $198.95 against $55.03. Sealed Collector Boosters tend to appreciate while the singles inside them lose value, so the gap widens with age.

**Set Boosters were the best value WOTC sold.** From 2021 to 2023, 80–100% of them beat sealed at every age, at a median of 110–126% of the pack price. That ended in 2024, when Set Boosters were folded into Play Boosters.

**Play and Draft Boosters hover at break-even, and bulk decides which side.** At market prices, half to three quarters of them beat sealed, at a median a few percent above. But the market price of a $0.10 common is not money you can collect, because nobody buys one common. Count every card under $0.25 as worthless and the median drops to 79–88% of the pack price, with only 20–32% beating sealed. Whether opening a Play Booster pays comes down to whether you have a way to sell bulk.

**The exceptions are specific.** Murders at Karlov Manor's Play Booster beat its sealed price in 138 of 139 weeks, and Modern Horizons 3's in all 121. Innistrad Remastered's never did, in 89 weeks. Twice, the sealed market fell far enough that opening was worth double: Brothers' War Set Boosters sold for $2.99 in February 2023 against an EV of $6.12, and Battle for Baldur's Gate Collector Boosters for $11.91 in October 2023 against $24.94. Both looked like data errors until box prices, divided by packs per box, agreed.

# Caveats

Market price is what cards recently sold for, not what a seller nets. Fees and shipping take 15–30% off small sales, and market prices are unreliable for cards that rarely trade; the dashboard's "bulk at $0" view corrects for the worst of that. Treating slots as independent ignores collation, since real packs avoid duplicates, but that barely moves value. For pre-2024 Draft and Set Boosters, many odds are MTGJSON's estimates rather than WOTC's, and each set's file records which. Finally, excluding the "<1%" chase cards lowers Collector Booster EVs, so it is the one modeling choice that leans toward the conclusion above. Each set's file names the excluded cards, for anyone who wants to price them back in.

The [code is on GitHub](https://github.com/k8rthik/pack-ev), including each set's definition, the price store, and the scripts that check sampling against full fetches. On the [dashboard](/packev) you can pick any set and booster and follow its EV and sealed price week by week.
