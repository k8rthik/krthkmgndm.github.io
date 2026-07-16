# keerthik.dev

Personal portfolio website built with React + Vite.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

This site is deployed on Vercel with serverless API functions for blog posts.

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
