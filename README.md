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

## Devlog

A git-log style column on the home page (right on desktop, stacked below on
mobile). Entries live in `devlog.json` and can be added/removed from the
front end via the `[edit]` toggle — no backend commits required.

Editing posts to `/api/devlog`, which commits the change back to
`devlog.json` in this repo using the GitHub contents API. The commit
triggers a normal Vercel rebuild, so new entries go live ~30s after saving.

Set these environment variables in Vercel (Project → Settings → Environment
Variables) to enable editing:

| Variable          | Required | Description                                                                 |
| ----------------- | -------- | --------------------------------------------------------------------------- |
| `DEVLOG_PASSWORD` | yes      | Password entered in the front-end editor to unlock adding/removing entries. |
| `GITHUB_TOKEN`    | yes      | Token used to commit `devlog.json`. See scope below.                        |
| `GITHUB_REPO`     | no       | `owner/repo` to commit to. Defaults to `k8rthik/krthkmgndm.github.io`.      |
| `GITHUB_BRANCH`   | no       | Branch to commit to. Defaults to `main`.                                     |

`GITHUB_TOKEN` should be a **fine-grained personal access token** scoped to
this repository with **Contents: Read and write** permission (that's the only
permission it needs). Classic tokens work too with the `repo` scope.

Without these vars the editor UI still renders, but saving reports that
editing isn't configured. The token is only ever used server-side in the API
route and is never sent to the browser.

Images: paste an image URL in the editor (only `http(s)://` or repo-relative
`/paths` are accepted). File uploads can be layered on later using the same
commit mechanism.
