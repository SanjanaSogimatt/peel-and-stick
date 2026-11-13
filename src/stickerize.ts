import type { StickerArt } from "./types";

export interface StickerizeOptions {
  /** White border thickness in CSS px at the default display size. Default 10. */
  border?: number;
  /** Border color. Default white. */
  borderColor?: string;
  /** Fill holes fully enclosed by the border (how real die cuts are made). Default true. */
  fillHoles?: boolean;
  /** Longest side of the finished sticker in CSS px. Default 240. */
  size?: number;
  /** Rendering scale for crisp edges on retina screens. Default 2. */
  scale?: number;
  /** Largest file accepted, in bytes. Default 2 MB. */
  maxBytes?: number;
}

export class StickerizeError extends Error {
  constructor(message: string) { super(message); this.name = "StickerizeError"; }
}

const MB = 1024 * 1024;
const fmtMB = (b: number) => `${(b / MB).toFixed(1)} MB`;

/**
 * Turns an SVG or PNG into a die-cut sticker image: the shape is traced from its
 * transparent pixels, grown outward into a smooth border, and the art is laid on top.
 * Runs entirely in the browser. The result plugs straight into <Sticker art={...} />.
 */
export async function stickerize(input: File | Blob | string, options: StickerizeOptions = {}): Promise<StickerArt> {
  if (typeof document === "undefined") throw new StickerizeError("stickerize runs in the browser only.");
  const { border = 10, borderColor = "#ffffff", fillHoles = true, size = 240, scale = 2, maxBytes = 2 * MB } = options;

  const name = input instanceof File ? input.name.replace(/\.[^.]+$/, "") : "sticker";
  const { url, revoke } = await toImageUrl(input, maxBytes);
  try {
    const img = await loadImage(url);
    const fullW = img.naturalWidth || img.width, fullH = img.naturalHeight || img.height;
    if (!fullW || !fullH) throw new StickerizeError("This image has no size. Add a viewBox or width and height to the SVG.");
    // Trim empty margins so the art, not its canvas, decides the sticker's size
    const crop = contentBox(img, fullW, fullH);
    const nw = crop.w, nh = crop.h;

    // Art fits inside `size`, border sits around it
    const b = Math.max(0, border) * scale;
    const pad = Math.ceil(b + 2 * scale);
    const inner = size * scale - pad * 2;
    if (inner < 16) throw new StickerizeError("The border is too thick for this sticker size.");
    const k = inner / Math.max(nw, nh);
    const aw = Math.max(1, Math.round(nw * k)), ah = Math.max(1, Math.round(nh * k));
    const W = aw + pad * 2, H = ah + pad * 2;

    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new StickerizeError("Your browser couldn't create a drawing canvas.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, pad, pad, aw, ah);

    const art = ctx.getImageData(0, 0, W, H);
    const n = W * H;
    const inside = new Uint8Array(n);
    let count = 0;
    for (let i = 0; i < n; i++) if (art.data[i * 4 + 3] > 24) { inside[i] = 1; count++; }
    if (count === 0) throw new StickerizeError("This image is fully transparent, so there's no shape to cut around.");

    // Distance from every pixel to the shape, then a soft-edged border at radius b
    const dist = distanceTransform(inside, W, H);
    const cover = new Float32Array(n);
    for (let i = 0; i < n; i++) cover[i] = Math.min(1, Math.max(0, b + 0.75 - Math.sqrt(dist[i])));
    if (fillHoles) fillEnclosed(cover, W, H);

    const [r, g, bl] = parseColor(borderColor, ctx);
    const out = ctx.createImageData(W, H);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      out.data[o] = r; out.data[o + 1] = g; out.data[o + 2] = bl;
      out.data[o + 3] = Math.round(cover[i] * 255);
    }
    ctx.putImageData(out, 0, 0);
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, pad, pad, aw, ah); // art on top of the border

    return { name, src: canvas.toDataURL("image/png"), width: Math.round(W / scale), height: Math.round(H / scale) };
  } finally {
    revoke();
  }
}

/* ---------------------------------------------------------------- input */

async function toImageUrl(input: File | Blob | string, maxBytes: number) {
  if (typeof input === "string") {
    const t = input.trim();
    if (t.startsWith("<")) return blobUrl(prepareSvg(t), "image/svg+xml");
    return { url: input, revoke: () => {} }; // a URL or data URI
  }
  if (input.size > maxBytes) throw new StickerizeError(`This file is ${fmtMB(input.size)}. Stickers need to be under ${fmtMB(maxBytes)}.`);
  const type = input.type || "";
  const fname = input instanceof File ? input.name.toLowerCase() : "";
  const looksSvg = type === "image/svg+xml" || fname.endsWith(".svg");
  if (looksSvg) return blobUrl(prepareSvg(await input.text()), "image/svg+xml");
  if (/^image\/(png|webp|gif|jpeg)$/.test(type) || /\.(png|webp|gif|jpe?g)$/.test(fname)) {
    return blobUrl(input, type || "image/png");
  }
  // Last chance: sniff for SVG markup
  const head = await input.slice(0, 512).text();
  if (/<svg[\s>]/i.test(head)) return blobUrl(prepareSvg(await input.text()), "image/svg+xml");
  throw new StickerizeError("That file type isn't supported. Upload an SVG or a PNG.");
}

function blobUrl(data: Blob | string, type: string) {
  const blob = typeof data === "string" ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

/**
 * Makes an SVG safe and loadable as an image. Browsers never run scripts or load
 * outside files inside an <img>, but we still strip them, and we make sure the
 * root has a namespace and a size so it rasterizes at all.
 */
export function prepareSvg(text: string): string {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length) {
    throw new StickerizeError("This SVG couldn't be read. Try exporting it again from your design tool.");
  }
  doc.querySelectorAll("script, foreignObject").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      if (/^on/i.test(a.name)) el.removeAttribute(a.name);
      if (/href$/i.test(a.name) && !/^(#|data:)/i.test(a.value.trim())) el.removeAttribute(a.name);
    }
  });
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const vb = (svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
  const hasVB = vb.length === 4 && vb[2] > 0 && vb[3] > 0;
  const w = parseFloat(svg.getAttribute("width") || ""), h = parseFloat(svg.getAttribute("height") || "");
  const pctOrMissing = (v: string | null) => !v || /%$/.test(v.trim());
  if (hasVB && (pctOrMissing(svg.getAttribute("width")) || pctOrMissing(svg.getAttribute("height")))) {
    const s = 512 / Math.max(vb[2], vb[3]);
    svg.setAttribute("width", String(vb[2] * s));
    svg.setAttribute("height", String(vb[3] * s));
  } else if (!hasVB && !(w > 0 && h > 0)) {
    svg.setAttribute("width", "512");
    svg.setAttribute("height", "512");
  }
  return new XMLSerializer().serializeToString(svg);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const t = setTimeout(() => reject(new StickerizeError("The image took too long to load.")), 10000);
    img.onload = () => { clearTimeout(t); resolve(img); };
    img.onerror = () => { clearTimeout(t); reject(new StickerizeError("This image couldn't be drawn. If it's an SVG, check that it opens in a browser.")); };
    img.decoding = "async";
    img.src = url;
  });
}

/** Bounding box of the visible pixels, in the image's own coordinates. */
function contentBox(img: HTMLImageElement, w: number, h: number) {
  const k = Math.min(1, 512 / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  const x = c.getContext("2d", { willReadFrequently: true });
  if (!x) return { x: 0, y: 0, w, h };
  x.drawImage(img, 0, 0, cw, ch);
  const d = x.getImageData(0, 0, cw, ch).data;
  let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
  for (let yy = 0; yy < ch; yy++) for (let xx = 0; xx < cw; xx++) {
    if (d[(yy * cw + xx) * 4 + 3] > 24) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
  }
  if (x1 < 0) return { x: 0, y: 0, w, h }; // empty: let the main pass report it
  const m = 1; // one probe pixel of slack so anti-aliased edges aren't clipped
  const X0 = Math.max(0, (x0 - m) / k), Y0 = Math.max(0, (y0 - m) / k);
  const X1 = Math.min(w, (x1 + 1 + m) / k), Y1 = Math.min(h, (y1 + 1 + m) / k);
  return { x: X0, y: Y0, w: X1 - X0, h: Y1 - Y0 };
}

function parseColor(c: string, ctx: CanvasRenderingContext2D): [number, number, number] {
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillStyle = c;
  const v = String(ctx.fillStyle);
  ctx.restore();
  const m = v.match(/^#([0-9a-f]{6})$/i);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
  const r = v.match(/\d+/g);
  return r ? [+r[0], +r[1], +r[2]] : [255, 255, 255];
}

/* ------------------------------------------------------------- geometry */

/** Squared Euclidean distance to the nearest "inside" pixel (Felzenszwalb & Huttenlocher). */
export function distanceTransform(inside: Uint8Array, W: number, H: number): Float32Array {
  const INF = 1e20;
  const d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = inside[i] ? 0 : INF;
  const N = Math.max(W, H);
  const f = new Float64Array(N), v = new Int32Array(N), z = new Float64Array(N + 1), out = new Float64Array(N);
  const pass = (len: number) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      out[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
  };
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = d[y * W + x];
    pass(H);
    for (let y = 0; y < H; y++) d[y * W + x] = out[y];
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) f[x] = d[y * W + x];
    pass(W);
    for (let x = 0; x < W; x++) d[y * W + x] = out[x];
  }
  return d;
}

/** Any gap the outside can't reach (a hole inside the shape) becomes solid. */
function fillEnclosed(cover: Float32Array, W: number, H: number) {
  const outside = new Uint8Array(W * H);
  const stack: number[] = [];
  const push = (i: number) => { if (!outside[i] && cover[i] < 0.5) { outside[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop()!, x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W);
    if (y < H - 1) push(i + W);
  }
  // Fill the holes, then smooth away the soft rim left around them. Soft pixels on
  // the true outer edge touch the outside region, so their anti-aliasing is kept.
  for (let i = 0; i < W * H; i++) if (!outside[i] && cover[i] < 0.5) cover[i] = 1;
  for (let i = 0; i < W * H; i++) {
    if (outside[i] || cover[i] >= 1 || cover[i] <= 0) continue;
    const x = i % W, y = (i / W) | 0;
    const touchesOutside =
      (x > 0 && outside[i - 1]) || (x < W - 1 && outside[i + 1]) || (y > 0 && outside[i - W]) || (y < H - 1 && outside[i + W]);
    if (!touchesOutside) cover[i] = 1;
  }
}
