# keerthik.dev

Personal site built with Next.js (App Router), deployed on Vercel.
Blog posts live in `posts/*.md`; the `/bgelo` board-game rating
dashboard is fed by [bgelo]'s exported payload in `data/elo.json`.

[bgelo]: https://github.com/k8rthik

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
