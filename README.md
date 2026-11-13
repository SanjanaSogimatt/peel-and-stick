# peel-and-stick

Real vinyl stickers for React. People peel them off a glossy backing, stick them anywhere on your page, and peel them off again.

- **Feels like the real thing.** The sticker folds where you pull it, shows its paper back, and the backing flutters away when it comes off.
- **Any shape.** Transparent pixels become the die cut, so stars, clouds and logos peel along their own edges.
- **21 stickers included,** from classic to cute to pixel art. Or use your own images.
- **Small.** About 6.4 kB gzipped for the component and one sticker. No dependencies besides React, and no stylesheet to import.
- **Works with Next.js** and other server rendering out of the box.

## Install

```bash
npm install peel-and-stick
```

Also works with `pnpm add peel-and-stick`, `yarn add peel-and-stick` and `bun add peel-and-stick`. Needs React 18 or 19.

## Quick start

```jsx
import { Sticker, star } from "peel-and-stick";

export default function Hero() {
  return <Sticker art={star} width={120} rotate={-8} alt="Star" />;
}
```

Drag the sticker past its middle and it comes off. Drop it anywhere on the page. Grab it again to move it.

### Use your own image

```jsx
<Sticker src="/stickers/logo.png" width={160} alt="Our logo" />
```

PNG, SVG and WebP all work. Transparent areas become the sticker's outline, so give your image a transparent background.

### Lay out a sheet

`StickerSheet` is an optional glossy card that lines stickers up like a real sticker sheet.

```jsx
import { Sticker, StickerSheet, star, heart, pixelFrog } from "peel-and-stick";

<StickerSheet>
  <Sticker art={star} width={110} />
  <Sticker art={heart} width={100} rotate={6} />
  <Sticker art={pixelFrog} width={120} rotate={-4} />
</StickerSheet>
```

To give people a fresh sheet, change its `key`. That also removes the stickers they placed from it.

## Built in stickers

| Set | Stickers |
|---|---|
| Classic | `star`, `heart`, `hello`, `bolt`, `shipIt`, `coffee`, `wip`, `cloud` |
| Cute | `toast`, `cactus`, `rainbow`, `dumpling`, `sleepyMoon` |
| Pixel | `pixelHeart`, `pixelSlime`, `pixelCat`, `pixelStrawberry`, `pixelBoba`, `pixelFrog`, `pixelLgtm` |

Each sticker is its own export, so your bundle only includes the ones you import. To get every sticker at once:

```jsx
import { Sticker, allStickers } from "peel-and-stick";

Object.values(allStickers).map((art) => <Sticker key={art.name} art={art} width={100} />);
```

## Sticker props

| Prop | Type | Default | Description |
|---|---|---|---|
| `art` | `StickerArt` | | A built in sticker, or your own `{ src, width, height }` |
| `src` | `string` | | Any image URL, used instead of `art` |
| `width` | `number` | art width | Width in pixels. Height follows the aspect ratio |
| `height` | `number` | | Set instead of `width`, or set both to stretch |
| `rotate` | `number` | `0` | Tilt in degrees |
| `alt` | `string` | | Accessible label |
| `liner` | `boolean` | `true` | Show the backing paper that falls away when the sticker comes off |
| `peelable` | `boolean` | `true` | Allow peeling at all |
| `repeelable` | `boolean` | `true` | Allow peeling again after it's been stuck somewhere |
| `detachAt` | `number` | `0.4` | How much of the sticker (0 to 1) must be peeled before it comes off |
| `keepSpace` | `boolean` | `true` | Leave the empty spot behind on the sheet |
| `zIndex` | `number` | `1000` | z-index of the sticker once it comes off the sheet. Raise it to show a sticker above a modal |
| `className`, `style` | | | Applied to the sticker's spot on the page |

### Events

| Prop | Type | When it fires |
|---|---|---|
| `onPeelStart` | `() => void` | Someone starts peeling |
| `onDetach` | `() => void` | The sticker comes off. Fires again each time a placed sticker is peeled |
| `onStick` | `({ x, y, rotate }) => void` | It lands. `x` and `y` are page coordinates of its center |

```jsx
<Sticker art={star} onStick={({ x, y }) => console.log("Stuck at", x, y)} />
```

## Sticker maker

Let people turn their own SVG or PNG into a sticker, right in the browser. It lives in a separate entry point, so apps that don't use it never download it (about 8 kB gzipped).

```jsx
import { StickerMaker } from "peel-and-stick/maker";

<StickerMaker onCreate={(art) => console.log(art)} />
```

People can upload a file, drop it in, or paste SVG code (for example from Figma's Copy as SVG). They can change the border thickness and color, the size and the tilt, peel the result, copy the code and download a PNG.

| Prop | Type | Default | Description |
|---|---|---|---|
| `samples` | `{ name, svg }[]` | 3 samples | Example SVGs to try. Pass `[]` to hide them |
| `allowDownload` | `boolean` | `true` | Show the Download PNG button |
| `onCreate` | `(art: StickerArt) => void` | | Called each time a sticker is made |
| `className`, `style` | | | Applied to the outer element |

### `stickerize()`

The converter behind the maker. It returns art you can pass straight to `Sticker`.

```jsx
import { stickerize } from "peel-and-stick/maker";
import { Sticker } from "peel-and-stick";

const art = await stickerize(fileOrSvgCode, { border: 10, borderColor: "#ffffff" });

<Sticker art={art} width={200} />;
```

| Option | Type | Default | Description |
|---|---|---|---|
| `border` | `number` | `10` | Border thickness in pixels |
| `borderColor` | `string` | `"#ffffff"` | Any CSS color |
| `fillHoles` | `boolean` | `true` | Fill gaps fully enclosed by the border |
| `size` | `number` | `240` | Longest side of the finished sticker |
| `scale` | `number` | `2` | Rendering scale for sharp edges on high density screens |
| `maxBytes` | `number` | 2 MB | Largest file accepted |

It accepts a `File`, a `Blob`, a string of SVG code or an image URL. When something goes wrong it throws a `StickerizeError` with a message you can show people, such as "This file is 3.0 MB. Stickers need to be under 2.0 MB."

Scripts and links to outside files are removed from uploaded SVGs. Convert text to outlines before uploading, because fonts don't load when an SVG is drawn as an image.

## Next.js

The package is marked as a client component, so you can use it straight from server components in the App Router, without adding `"use client"` yourself. It also works in the Pages Router.

```jsx
// app/page.tsx
import { Sticker, star } from "peel-and-stick";

export default function Page() {
  return <Sticker art={star} width={120} />;
}
```

## TypeScript

Types are included. Useful ones to import:

```ts
import type { StickerProps, StickerArt, StickPosition } from "peel-and-stick";
import type { StickerMakerProps, StickerizeOptions } from "peel-and-stick/maker";
```

## Accessibility

- Give each sticker an `alt` label. It's announced as an image.
- When someone has reduced motion turned on, the bounce, shine and falling backing are skipped. Peeling still works.
- Peeling needs a pointer: a mouse, a finger or a pen. Stickers are decoration, so keep anything important out of them.

## Good to know

- Placed stickers stay until the page reloads. To remember where people put them, save the position from `onStick`. Putting a sticker straight into a saved spot isn't supported yet.
- Unmounting a `Sticker` also removes it from the page, wherever it was stuck.
- Needs a browser with CSS masks, `clip-path` and pointer events, which all current major browsers have.

## License

MIT
