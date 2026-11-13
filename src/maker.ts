// peel-and-stick/maker: turn an uploaded SVG or PNG into a peelable die-cut sticker.
// A separate entry point, so apps that only show stickers don't ship the converter.
export { StickerMaker } from "./StickerMaker";
export type { StickerMakerProps, StickerMakerSample } from "./StickerMaker";
export { stickerize, StickerizeError, prepareSvg } from "./stickerize";
export type { StickerizeOptions } from "./stickerize";
