# keerthik.dev

Personal site built with Next.js (App Router), deployed on Vercel.
Blog posts live in `content/posts/*.md`; the `/bgelo` board-game rating
dashboard is fed by [bgelo]'s exported payload in `data/elo.json`.

[bgelo]: https://github.com/k8rthik

## Editing content

Everything edited by hand lives in `content/`:

- `content/site.js`: name, bio, email, links, how many projects/posts the homepage lists
- `content/projects.json`: the project list; `added` (YYYY-MM-DD) sets recency order. Description style is in CLAUDE.md under "Writing descriptions"
- `content/posts/*.md`: blog posts (`active: 0` in frontmatter hides a draft from the lists)

`data/` holds generated payloads; never edit those by hand.

## Development

```bash
npm install
npm run dev    # dev server
npm test       # node:test suite — derivation units + data invariants
npm run build  # production build
```

CI runs `npm test` and `npm run build` on every push. Conventions and
testing guidelines for contributors (human or AI) are in
[CLAUDE.md](./CLAUDE.md).

## Data refresh

`data/elo.json` is generated — never hand-edit it. From the bgelo repo:

```bash
python3 -m bgelo.refresh     # re-rate from the latest BG Stats export
python3 -m bgelo.site_sync   # copy payload here, commit, push
```
