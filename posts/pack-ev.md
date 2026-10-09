---
title: "pack ev: is a magic pack worth more opened?"
date: "2026-10-09"
description: "Pricing every card a booster can contain across 39 sets and five years of TCGplayer history, and what that says about when opening beats keeping a pack sealed"
slug: "pack-ev"
time: 9
active: 1
---

Every Magic set comes with the same small decision: open the pack, or sell it sealed. Opening gives you the cards, which you can sell one by one. Keeping it gives you whatever the next person will pay for an unopened pack. The two have a well-defined relationship. A pack's *expected value* (EV) is the sum, over every card it could contain, of the chance you pull that card times what it sells for. Compare that to the sealed price and you know which way the trade leans.

I built [pack-ev](https://github.com/k8rthik/pack-ev) to do that properly for every booster sold since mid-2021: 39 sets, 94 booster products, priced every week from a week after release to today. The [dashboard](/packev) has the numbers. This post covers how they're made and what turned out to be interesting.

# What's in a pack

Wizards of the Coast publishes a "Collecting" article for each set that lists every slot of every booster with its odds. A Lorwyn Eclipsed Play Booster's rare slot, for example, is a rare 78.2% of the time, a mythic 13.6%, a fable frame rare 4.6%, and so on down to borderless cards listed only as "less than 1%". Within a group (say, the 26 rare fable frame cards) every card is equally likely.

Each set is a small TOML file that turns that article into card pools and slot odds. Pools are picked out of [Scryfall](https://scryfall.com) by collector number, frame treatment and rarity, and every pool size the article states is checked. If WOTC says there are 81 commons and the filter finds 80, the set fails validation instead of quietly skewing the EV. The 2024+ sets have full published odds. For older Draft and Set Boosters WOTC only published a handful of rates, so the gaps come from [MTGJSON](https://mtgjson.com)'s estimated booster sheets, with WOTC's numbers taking precedence wherever both exist.

Transcribing 39 articles turned up some honest mistakes on WOTC's side. The Hobbit and Marvel's Spider-Man both list their Play Booster wildcard as roughly 74% common and 4% uncommon, which is almost certainly the two numbers swapped. Those are transcribed as published; the swap moves EV by cents because both sides are bulk.

One deliberate exclusion: one-off chase cards whose odds are only given as "less than 1% of packs" (serialized cards, headliners, the raised-foil Avatar Aang) are left out. Any share you assign them is a guess, and the guess dominates. At the model's default floor for "<1%" odds, the $4,800 Aang alone would have added $4.80 to every Collector Booster's EV.

# Every combination at once

The EV is a weighted sum, but the more interesting question is the whole distribution: line every possible pack up from worst to best and see where the sealed price falls. A Collector Booster has something like 10^30 possible contents, so listing them is out. If the slots are independent, though, the distribution of a pack's total value is the convolution of each slot's value distribution. On a one-cent grid that's a few FFTs and comes out exact.

The distribution is what makes EV misleading on its own. A Lorwyn Eclipsed Play Booster has an EV of $5.56 against a $4.77 pack price, which sounds like a good trade. The median pack is worth $3.27, and 73% of packs are worth less than the $4.77 they cost. The EV is carried by the occasional $20 rare, and by a tail of rarer packs that runs up to $150. Open one pack and you'll probably lose; open a box and you'll probably come out close to EV.

# Prices over time

Current prices come from [TCGCSV](https://tcgcsv.com), which mirrors TCGplayer's API daily. History was harder: TCGCSV's daily archive has been taken offline, so weekly history comes from the endpoint behind TCGplayer's own product price charts. It goes back to June 14, 2021 and no further, which is why the analysis starts with Modern Horizons 2.

It is also not a public API. My first pass ran it at 10 requests a second and got refused after about 1,400 requests. The fetcher now runs at 2 a second with a circuit breaker that pauses everything when refusals start, fetches each product's history exactly once into a Parquet store, and afterwards only appends the current week from TCGCSV (a handful of requests per set instead of one per card). I checked that the two agree before relying on it: on 35,653 overlapping prices they matched exactly 70–83% of the time and within 10% for 98–99%. A weekly refresh of all 39 sets now takes about five minutes.

Cheap cards are sampled rather than fetched individually: every card that makes up the top 98% of a booster's EV gets its own history, and the long tail follows an eight-card sample from its own pool and price band. Against two sets I fetched in full, that keeps the worst weekly EV error under 0.1%.

# What the data says

Align every booster on weeks since its release and the life cycle of each product type is clear. "Beats sealed" here means the pack's EV at TCGplayer market prices is above the price of the sealed pack that week.

| | launch | 3 months | 1 year | 2 years |
|---|---|---|---|---|
| Set Boosters (15) | 80% | 100% | 87% | 80% |
| Play / Draft Boosters (39) | 56% | 62% | 72% | 52% |
| Collector Boosters (40) | 48% | 11% | 18% | 12% |

**Collector Boosters are a coin flip at launch and a bad trade after.** In release week about half of them are worth opening. Three months later it's one in nine, and by year two the median Collector Booster's contents are worth 76% of its sealed price. Today, across all 40, the median is 57%. The worst are the most collectible: a Phyrexia: All Will Be One Collector Booster sells for $109.69 and its contents are worth $25.85; Lord of the Rings sells for $198.95 against $55.03. Sealed Collector Boosters keep appreciating while the singles inside them decay, so the gap only widens.

**Set Boosters were the best-value product WOTC made.** Between 2021 and 2023, 80–100% of them beat sealed at every age, at a median of 110–126% of the pack price. That's over now: Set Boosters were folded into Play Boosters in 2024.

**Play and Draft Boosters sit at break-even, and which side depends on bulk.** At market prices about half to three quarters of them beat sealed, at a median a few percent above. But "market price" for a $0.10 common is not something you can realize: nobody buys one common. Count every card under $0.25 as worthless and the median drops to 79–88% of the pack price, with only 20–32% beating sealed. For a Play Booster, whether opening pays is mostly a question of whether you have a way to sell bulk.

**The exceptions are specific.** Murders at Karlov Manor's Play Booster was above its price in 138 of 139 weeks, and Modern Horizons 3's in all 121. Innistrad Remastered's never was, in 89 weeks. And twice the sealed market dropped far enough that opening was worth double: Brothers' War Set Boosters sold for $2.99 in February 2023 against an EV of $6.12, and Battle for Baldur's Gate Collector Boosters for $11.91 in October 2023 against $24.94. Both looked like data errors until the box prices, divided by packs per box, agreed.

# Caveats

EV at market price is what cards have recently sold for, not what you'd net. Seller fees and shipping take 15–30% off small sales, and market prices are thin for cards that rarely trade. The "bulk at $0" view on the dashboard is a rough correction for the worst of that. Slots are treated as independent, which ignores collation (real packs avoid duplicates) but barely moves value. And for pre-2024 Draft and Set Boosters, many of the odds are MTGJSON's estimates rather than WOTC's numbers; every set's file records which.

The [code is on GitHub](https://github.com/k8rthik/pack-ev), including each set's definition, the price store, and the scripts that check the sampling against full fetches. The [dashboard](/packev) lets you pick any set and booster and watch its EV and sealed price week by week.
