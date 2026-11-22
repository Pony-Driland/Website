# Version

`version.json` is the **single source of truth** of the website version. Nothing else
should hardcode it.

```json
{
  "version": 502
}
```

## Why

Every static asset is requested with a `?v=<version>` query string, and the service
worker keeps the files inside the `pony-driland-v1` bucket. When the version
changes, the browser is forced to download the new files and the old cache is
dropped.

## Usage

```bash
npm run update-version   # distribute the current version
npm run bump-version     # increment the version, then distribute
```

`npm run build` and `npm run dev` already run `update-version` before esbuild,
so the generated files are always in sync with `version.json`.

## What is generated

| File                  | What changes                                              |
| --------------------- | --------------------------------------------------------- |
| `src/version.mjs`     | Whole file (`version`, `fileVersion` and `cacheName`).     |
| `public/index.html`   | Every `?v=` query string.                                 |
| `public/404.html`      | Every `?v=` query string.                                 |
| `public/ipfs-404.html` | Every `?v=` query string.                                |

## Runtime cache invalidation

`src/pwa/cache-version.mjs` compares the version of the current build with the
one stored in the local storage (`app-version`). When they differ, the whole
`pony-driland-v1` bucket is deleted before the service worker is registered, so
the new build never serves a file from the previous one.
