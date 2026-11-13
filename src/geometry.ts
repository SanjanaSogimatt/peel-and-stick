import type { Point } from "./types";

/** Keep the part of `poly` where (p - m)·n >= 0 (one Sutherland–Hodgman pass). */
export function clipHalf(poly: Point[], m: Point, n: Point): Point[] {
  const side = (p: Point) => (p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1];
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const sa = side(a), sb = side(b);
    if (sa >= 0) out.push(a);
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

export function polyArea(poly: Point[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    s += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(s) / 2;
}

export const toClipPath = (poly: Point[]) =>
  poly.length > 2 ? `polygon(${poly.map((p) => `${p[0].toFixed(2)}px ${p[1].toFixed(2)}px`).join(",")})` : "polygon(0 0,0 0,0 0)";

/** Rotate vector v by deg degrees. */
export function rot(v: Point, deg: number): Point {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Where the ray from the rect centre through p leaves the rect [0,w]x[0,h]. */
export function edgePoint(p: Point, w: number, h: number): Point {
  const cx = w / 2, cy = h / 2;
  let dx = p[0] - cx, dy = p[1] - cy;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) dy = 1;
  const t = Math.min(dx ? cx / Math.abs(dx) : Infinity, dy ? cy / Math.abs(dy) : Infinity);
  return [cx + dx * t, cy + dy * t];
}
