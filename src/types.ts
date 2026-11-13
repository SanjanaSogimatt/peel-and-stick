/** A sticker image. Built-in stickers and Figma-synced stickers use this shape. */
export interface StickerArt {
  name?: string;
  /** Image URL or data URI. Transparent areas become the die-cut outline. */
  src: string;
  /** Natural width, used for the aspect ratio. */
  width: number;
  /** Natural height, used for the aspect ratio. */
  height: number;
}

export interface StickPosition {
  /** Page X of the sticker's centre (includes scroll). */
  x: number;
  /** Page Y of the sticker's centre (includes scroll). */
  y: number;
  /** Rotation in degrees. */
  rotate: number;
}

export type Point = [number, number];
