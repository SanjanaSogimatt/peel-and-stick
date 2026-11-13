# Working on peel-and-stick

This file is for people working on the package and its website. It isn't published to npm.

Needs Node 20.9 or newer.

## Setup

```bash
npm install
npm run dev            # website at http://localhost:3000 with live reload
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Runs the website with live reload |
| `npm run site:build` | Production build of the website |
| `npm run site:start` | Runs that build at http://localhost:3000 |
| `npm run build` | Builds the npm package into `dist/` |
| `npm run dev:package` | Rebuilds the package on every save |
| `npm run typecheck` | Type checks the package |
| `npm run art` | Turns the SVGs in `/stickers` into exports in `src/art/index.ts` |
| `npm run figma:sync` | Pulls stickers from Figma, then runs `art` |
| `npm run wordmark` | Rebuilds the footer wordmark from Geist Bold |

## Project layout

| Folder | What's in it |
|---|---|
| `src/` | The package: `Sticker`, `StickerSheet`, the sticker maker and the converter |
| `src/art/` | Generated sticker exports. Don't edit by hand; run `npm run art` |
| `stickers/` | One SVG per built in sticker. The file name becomes the export name |
| `site/` | The website, a Next.js app. Pages are in `site/app`, components in `site/components/site.tsx` |
| `scripts/` | Build helpers for sticker art, Figma sync and the wordmark |

The website imports the package straight from `src/`, so changes to the stickers show up on the site as soon as you save.

## Adding stickers

### By hand

1. Add an SVG to `/stickers`, for example `rocket.svg`. It needs `xmlns` and a `viewBox`.
2. Give it a transparent background and a white outline for the die cut look.
3. Run `npm run art`. It becomes `import { rocket } from "peel-and-stick"`.

### From Figma

1. In Figma, open Settings, then Security, and create a personal access token with read access to file content.
2. Create a `.env` file in the project root (it's ignored by git):
   ```
   FIGMA_TOKEN=figd_your_token
   FIGMA_FILE=https://www.figma.com/design/XXXX/My-Stickers
   ```
3. Name each sticker frame or component `sticker/name`, for example `sticker/rocket`, with a transparent background.
4. Run:
   ```bash
   npm run figma:sync                    # download and regenerate
   npm run figma:sync -- --dry           # list what it finds, change nothing
   npm run figma:sync -- --page "Stickers"
   ```

Text is converted to outlines on export, so fonts render the same everywhere.

## Deploying the website

On Vercel, import the repo and set the **Root Directory** to `site`. Vercel detects Next.js and builds it.

## Publishing to npm

```bash
npm login
npm publish
```

`prepublishOnly` runs the build first. Only `dist/`, `README.md` and `LICENSE` are published.
