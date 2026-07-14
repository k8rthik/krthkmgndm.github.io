---
title: "cod-sync: keeping Cockatrice decks in sync without losing your printings"
date: "2026-07-10"
description: "A small CLI that diffs your .cod decks against Moxfield, Archidekt, or ManaBox and applies only the changes you approve"
slug: "cod-sync"
time: 6
active: 1
---

I keep my Magic decklists on Moxfield and playtest them in Cockatrice. Those two things do not talk to each other, and the standard workaround is bad: export from Moxfield, reimport into Cockatrice, and watch every printing you carefully picked get wiped, banner card included. After doing that dance one too many times I built [cod-sync](https://github.com/k8rthik/cod-sync), a Python CLI that makes the *smallest possible edit* to your `.cod` files instead.

The idea is simple: the deck site is the source of truth for the *list*, but your local file is the source of truth for everything else. cod-sync pulls the remote list, diffs it against your `.cod`, and walks you through the changes one card at a time. Quantities update, removed cards get deleted, new cards get appended as bare entries so you can pick the art in Cockatrice yourself. Everything you didn't change — printing pins, the banner card, tags, comments, the deck name — stays byte-for-byte identical.

# What it does

There are no subcommands. You give it one positional argument and it figures out what you meant:

```sh
cod-sync                                          # walk the current folder
cod-sync ~/decks -r                               # walk a folder recursively
cod-sync foo.cod https://moxfield.com/decks/abc   # sync a file against a URL
cod-sync foo.cod                                  # sync against the URL stored in the file
cod-sync https://moxfield.com/decks/abc           # create a new deck from a URL
cod-sync foo.cod --info                           # read-only deck summary
```

Sources: Moxfield, Archidekt, ManaBox share pages, or a plain-text decklist in MTGA/MTGO format. The diff review is interactive — `y`/`n` per card, `a` for accept-all, `i` for "stop suggesting this card ever again" — with `-y` and `-q` flags to run the whole thing hands-free.

The feature that makes it actually pleasant day-to-day is **URL memory**. The first time you sync a deck, cod-sync writes one marker line into the deck's comments field:

```
cod-sync-source: https://archidekt.com/decks/23168622
```

Next time you run `cod-sync ~/decks -y`, every deck with a stored URL syncs automatically. Fifteen decks, one command, no prompts. The marker lives *in the deck file itself*, right where Cockatrice shows comments, so there's no sidecar config to lose and the un-ignore path for suppressed cards is literally "delete the line in Cockatrice's comments box."

# The interesting implementation bits

## A format-preserving writer

The core promise is that a no-op sync produces a byte-identical file. That meant writing a `.cod` parser/writer that reproduces exactly what Cockatrice itself writes — same indentation, same attribute order, same self-closing tag forms. It sounds fussy, but it's what makes the tool trustworthy: you can `git diff` a synced deck folder and see *only* the cards that actually changed. Any XML library that reserializes the whole tree would touch every line.

## Multi-face cards are a minefield

Cockatrice's card database keys multi-face cards two different ways depending on layout. True double-faced cards (transform, MDFCs) are keyed by the front face only — `Storm the Vault`, not `Storm the Vault // Vault of Catlacan`. But split cards, adventures, aftermath cards, and the Duskmourn "Room" enchantments keep their full `A // B` name. Moxfield and Archidekt report full names for everything, so cod-sync shapes every name using the card's layout, verified empirically against Cockatrice's own `cards.xml`.

The design decision I like most here: the diff layer compares names *verbatim* and never reshapes. If a local file has a stale name shape from an older version, it just shows up as a remove + add pair and the file heals on the next sync. All the shaping knowledge lives in one module instead of leaking comparison heuristics everywhere.

## Secret Lair reskins

Secret Lair loves shipping cards under flavor names — `Unstable Harmonics` is mechanically `Rhystic Study`, and Moxfield will happily report the flavor name that Cockatrice has never heard of. cod-sync resolves these through three layers, cheapest first: a bundled dictionary of every reskin Scryfall knew at release time, a per-user disk cache, and finally one batched POST to Scryfall's `/cards/collection` endpoint for anything unknown. Only definitive answers get cached — a network timeout falls back to the printed name for that run only, so one blip never permanently masks a reskin.

There's deliberately no standalone override command for these mappings. Instead, the first time a mapping is applied you get asked right in the sync flow — accept it, keep the printed name, or type your own replacement — and the answer is persisted so no name ever asks twice, across all your decks.

## Making a CLI feel fast

Two small things ended up dominating latency. First, importing `requests` costs about 75ms — over half of total CLI startup — so it's deferred until first network use; `--info`, `--help`, and a declined prompt never pay it. Second, TCP+TLS handshakes are paid once per host via a shared keep-alive session, not once per deck, so walking a folder of fifteen Moxfield decks doesn't do fifteen handshakes. The alt-name cache is loaded once per process, which means a directory walk amortizes: the first deck pays any Scryfall round-trips and the rest resolve names from memory.

# Status

It's at v0.18.0 after about 94 commits, built for my own deck folder and used daily. ~3,200 lines of Python, `requests` as the only runtime dependency, and a test suite that includes a check that the generated man page never drifts from the argparse definitions. The Moxfield and Archidekt fetchers ride on public APIs and ManaBox on its share-page markup, so those may need patches when the sites change — but the core promise holds: your printings are yours, and cod-sync will never touch them.

Code is on [GitHub](https://github.com/k8rthik/cod-sync) if you want to poke around — the whole thing is readable in one sitting.
