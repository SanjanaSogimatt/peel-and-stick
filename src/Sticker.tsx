import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Point, StickerArt, StickPosition } from "./types";
import { clamp, clipHalf, easeOutCubic, lerp, polyArea, rot, toClipPath } from "./geometry";
import { ensureStyles, useIsoLayoutEffect } from "./styles";
import { FallingLiner, LinerFace, type FallInfo } from "./Liner";

export interface StickerProps {
  /** A built-in or Figma-synced sticker, e.g. `import { star } from "peel-and-stick"`. */
  art?: StickerArt;
  /** Or any image URL (PNG/SVG/WebP with transparency gives a die-cut shape). */
  src?: string;
  /** Accessible label. */
  alt?: string;
  /** Width in px. Height follows the art's aspect ratio unless set. */
  width?: number;
  height?: number;
  /** Tilt in degrees while it sits on the sheet. */
  rotate?: number;
  /** Show the glossy backing that falls away when the sticker comes off. Default true. */
  liner?: boolean;
  /** Allow peeling at all. Default true. */
  peelable?: boolean;
  /** Allow peeling again after it's been stuck on the page. Default true. */
  repeelable?: boolean;
  /** How much of the sticker (0–1) must be peeled before it comes off. Default 0.4. */
  detachAt?: number;
  /** Keep the empty spot on the sheet after the sticker leaves. Default true. */
  keepSpace?: boolean;
  /** z-index of the sticker once it's off the sheet. Default 1000. */
  zIndex?: number;
  onPeelStart?: () => void;
  onDetach?: () => void;
  onStick?: (pos: StickPosition) => void;
  className?: string;
  style?: React.CSSProperties;
}

type Phase = "sheet" | "held" | "stuck";

const REDUCED = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
let topZ = 0;

// One shared layer for placed stickers. It has no z-index of its own, so each
// sticker's own z-index (from its zIndex prop) decides what it sits above.
function getLayer() {
  let el = document.querySelector<HTMLDivElement>("[data-peel-and-stick-layer]");
  if (!el) {
    el = document.createElement("div");
    el.setAttribute("data-peel-and-stick-layer", "");
    el.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none";
    document.body.appendChild(el);
  }
  return el;
}

const maskStyle = (src: string): React.CSSProperties => {
  const url = `url("${src.replace(/"/g, '\\"')}")`;
  return { WebkitMaskImage: url, maskImage: url };
};

export function Sticker({
  art,
  src: srcProp,
  alt = "",
  width: wProp,
  height: hProp,
  rotate = 0,
  liner = true,
  peelable = true,
  repeelable = true,
  detachAt = 0.4,
  keepSpace = true,
  zIndex = 1000,
  onPeelStart,
  onDetach,
  onStick,
  className,
  style,
}: StickerProps) {
  const src = srcProp ?? art?.src ?? "";
  const ratio = art ? art.height / art.width : 1;
  const w = wProp ?? (hProp ? hProp / ratio : art?.width ?? 120);
  const h = hProp ?? w * ratio;

  const [phase, setPhase] = useState<Phase>("sheet");
  const [linerState, setLinerState] = useState<"on" | "gone">(liner ? "on" : "gone");
  const [falling, setFalling] = useState<FallInfo | null>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const [layer, setLayer] = useState<HTMLElement | null>(null);

  // DOM refs (all per-frame updates write styles directly, no re-renders)
  const bodyRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const creaseRef = useRef<HTMLDivElement>(null);
  const flapWrapRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const curlRef = useRef<HTMLDivElement>(null);

  // Mutable state
  const st = useRef({
    phase: "sheet" as Phase,
    G: [0, 0] as Point, // where the peel started (sticker-local, unrotated px)
    P: [0, 0] as Point, // where that point has been pulled to
    pos: { x: 0, y: 0, rot: rotate }, // page centre + rotation once off the sheet
    carry: [0, 0] as Point, // eases the sticker under the pointer right after it comes off
    z: 0,
    anim: 0,
    lastX: 0,
    cleanup: null as null | (() => void),
  });

  useIsoLayoutEffect(() => { ensureStyles(); }, []);
  useEffect(() => () => { st.current.cleanup?.(); cancelAnimationFrame(st.current.anim); }, []);

  /* ------------------------------------------------------------------ draw */
  const draw = useCallback((G: Point, P: Point): number => {
    const face = faceRef.current, wrap = flapWrapRef.current, flap = flapRef.current, curl = curlRef.current, crease = creaseRef.current;
    if (!face || !wrap || !flap || !curl || !crease) return 0;
    const dx = P[0] - G[0], dy = P[1] - G[1], len = Math.hypot(dx, dy);
    if (len < 0.5) {
      face.style.clipPath = "";
      wrap.style.visibility = "hidden";
      wrap.style.transform = ""; // a hidden flap must not keep stretching the page
      crease.style.opacity = "0";
      return 0;
    }
    const n: Point = [dx / len, dy / len];
    const m: Point = [(G[0] + P[0]) / 2, (G[1] + P[1]) / 2];
    const rect: Point[] = [[0, 0], [w, 0], [w, h], [0, h]];
    const kept = clipHalf(rect, m, n);
    const peeled = clipHalf(rect, m, [-n[0], -n[1]]);
    face.style.clipPath = toClipPath(kept);

    // Mirror the lifted part over the fold line: x' = x - 2((x - m)·n)n
    const k = 2 * (m[0] * n[0] + m[1] * n[1]);
    const a = 1 - 2 * n[0] * n[0], b = -2 * n[0] * n[1], d = 1 - 2 * n[1] * n[1];
    wrap.style.transform = `matrix(${a},${b},${b},${d},${k * n[0]},${k * n[1]})`;
    wrap.style.visibility = peeled.length > 2 ? "visible" : "hidden";
    // Shadow the flap casts on the sticker: grows as it lifts. Offset is given in
    // pre-mirror space, so -n here lands as +n (away from the fold) on screen.
    const lift = clamp(len * 0.07, 0.5, 9);
    wrap.style.filter =
      `drop-shadow(${(-n[0] * lift).toFixed(2)}px ${(-n[1] * lift).toFixed(2)}px ${(2 + lift * 1.3).toFixed(1)}px rgba(20,24,31,${(0.18 + lift * 0.012).toFixed(3)})) ` +
      `drop-shadow(0 0 1px rgba(20,24,31,.25))`;
    flap.style.clipPath = toClipPath(peeled);

    // Lighting bands, measured as distance from the fold line
    const L = (w + h) * 2;
    const r = clamp(len * 0.2, 4, 28); // bend radius
    const tip = len / 2;
    const angBack = (Math.atan2(-n[1], -n[0]) * 180) / Math.PI;
    curl.style.width = curl.style.height = `${L}px`;
    curl.style.transform = `translate(${m[0]}px,${m[1]}px) rotate(${angBack}deg) translateY(-50%)`;
    curl.style.background = `linear-gradient(90deg,
      rgba(20,24,31,.30) 0px, rgba(20,24,31,.06) ${r * 0.35}px,
      rgba(255,255,255,.95) ${r * 0.85}px, rgba(255,255,255,.25) ${r * 1.7}px,
      rgba(255,255,255,0) ${r * 2.6}px, rgba(20,24,31,0) ${Math.max(r * 2.7, tip * 0.6)}px,
      rgba(20,24,31,.10) ${Math.max(r * 3, tip)}px)`;
    const angFwd = (Math.atan2(n[1], n[0]) * 180) / Math.PI;
    crease.style.opacity = "1";
    crease.style.width = crease.style.height = `${L}px`;
    crease.style.transform = `translate(${m[0]}px,${m[1]}px) rotate(${angFwd}deg) translateY(-50%)`;
    crease.style.background = `linear-gradient(90deg, rgba(20,24,31,.32) 0px, rgba(20,24,31,.1) ${r * 0.5}px, rgba(20,24,31,0) ${r * 1.4}px)`;

    return polyArea(peeled) / (w * h);
  }, [w, h]);

  /* --------------------------------------------------------------- helpers */
  const curRot = () => (st.current.phase === "sheet" ? rotate : st.current.pos.rot);

  const toLocal = (cx: number, cy: number): Point => {
    const r = bodyRef.current!.getBoundingClientRect();
    const v = rot([cx - (r.left + r.width / 2), cy - (r.top + r.height / 2)], -curRot());
    return [v[0] + w / 2, v[1] + h / 2];
  };

  const place = () => {
    const el = bodyRef.current, s = st.current;
    if (!el || s.phase === "sheet") return;
    el.style.transform = `translate(${s.pos.x + s.carry[0] - w / 2}px,${s.pos.y + s.carry[1] - h / 2}px) rotate(${s.pos.rot}deg)`;
    el.style.zIndex = String(s.z);
    // Shadow falls straight down on screen no matter how the sticker is tilted
    const a = rot([0, 3], -s.pos.rot), b = rot([0, 10], -s.pos.rot);
    el.style.setProperty("--s1x", `${a[0].toFixed(2)}px`); el.style.setProperty("--s1y", `${a[1].toFixed(2)}px`);
    el.style.setProperty("--s2x", `${b[0].toFixed(2)}px`); el.style.setProperty("--s2y", `${b[1].toFixed(2)}px`);
  };

  const tween = (ms: number, step: (t: number) => void, done?: () => void) => {
    cancelAnimationFrame(st.current.anim);
    if (REDUCED() || ms <= 0) { step(1); done?.(); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - t0) / ms, 1);
      step(t);
      if (t < 1) st.current.anim = requestAnimationFrame(tick);
      else done?.();
    };
    st.current.anim = requestAnimationFrame(tick);
  };

  const tweenP = (to: Point, ms: number, ease = easeOutCubic, done?: () => void) => {
    const s = st.current, from: Point = [s.P[0], s.P[1]];
    tween(ms, (t) => {
      const e = ease(t);
      s.P = [lerp(from[0], to[0], e), lerp(from[1], to[1], e)];
      draw(s.G, s.P);
    }, done);
  };

  const canPeel = () => peelable && (st.current.phase !== "stuck" || repeelable);

  /* --------------------------------------------------------------- gesture */
  const onPointerDown = (e: React.PointerEvent) => {
    const s = st.current;
    if (!canPeel() || s.phase === "held" || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    e.stopPropagation();
    cancelAnimationFrame(s.anim);

    const L = toLocal(e.clientX, e.clientY);
    s.G = L;
    s.P = L;

    document.documentElement.classList.add("pas-grabbing");
    window.getSelection?.()?.removeAllRanges();
    onPeelStart?.();
    let detached = false;

    const move = (ev: PointerEvent) => {
      if (ev.pointerType === "mouse" && ev.buttons === 0) { up(); return; }
      ev.preventDefault();
      if (!detached) {
        s.P = toLocal(ev.clientX, ev.clientY);
        if (draw(s.G, s.P) >= detachAt) { detached = true; detach(ev); }
      } else {
        follow(ev);
      }
    };
    const up = () => {
      cleanup();
      if (!detached) {
        // Let go early: it smooths back down with a tiny press
        tweenP([s.G[0], s.G[1]], 320, easeOutCubic, () => {
          draw(s.G, s.G);
          press();
        });
      } else {
        stick();
      }
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
      document.documentElement.classList.remove("pas-grabbing");
      s.cleanup = null;
    };
    s.cleanup = cleanup;
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
  };

  const press = () => {
    const el = bodyRef.current;
    if (!el || REDUCED()) return;
    el.dataset.press = "1";
    setTimeout(() => { if (bodyRef.current) delete bodyRef.current.dataset.press; }, 110);
  };

  // The grab point should stay under the pointer while it's held
  const centreFor = (cx: number, cy: number, r: number) => {
    const s = st.current;
    const off = rot([s.G[0] - w / 2, s.G[1] - h / 2], r);
    return { x: cx + window.scrollX - off[0], y: cy + window.scrollY - off[1] };
  };

  const detach = (ev: PointerEvent) => {
    const s = st.current;
    const fromSheet = s.phase === "sheet";
    const r = curRot();
    const c = centreFor(ev.clientX, ev.clientY, r);
    const box = bodyRef.current!.getBoundingClientRect();
    const now = { x: box.left + box.width / 2 + window.scrollX, y: box.top + box.height / 2 + window.scrollY };
    s.pos = { x: c.x, y: c.y, rot: r };
    s.carry = [now.x - c.x, now.y - c.y];
    s.lastX = ev.clientX;
    s.phase = "held";
    s.z = zIndex + (topZ += 2);
    if (fromSheet && linerState === "on" && slotRef.current) {
      const sr = slotRef.current.getBoundingClientRect();
      setFalling({ x: sr.left + sr.width / 2 + window.scrollX, y: sr.top + sr.height / 2 + window.scrollY, w, h, rot: rotate, z: s.z - 1 });
      setLinerState("gone");
    }
    if (!layer) setLayer(getLayer());
    setPhase("held");
    onDetach?.();
  };

  const follow = (ev: PointerEvent) => {
    const s = st.current;
    const vx = ev.clientX - s.lastX;
    s.lastX = ev.clientX;
    const target = rotate + clamp(vx * 0.9, -16, 16);
    const r = lerp(s.pos.rot, target, 0.25);
    const c = centreFor(ev.clientX, ev.clientY, r);
    s.pos = { x: c.x, y: c.y, rot: r };
    place();
  };

  const stick = () => {
    const s = st.current;
    s.phase = "stuck";
    cancelAnimationFrame(s.anim);
    s.carry = [0, 0];
    s.P = [s.G[0], s.G[1]];
    draw(s.G, s.G);
    const settle = rotate + (Math.random() - 0.5) * 6;
    const fromRot = s.pos.rot;
    // Rotation settles with a little spring while the body does the press/squash (CSS)
    tween(420, (t) => {
      const e = 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 1.5);
      s.pos.rot = lerp(fromRot, settle, e);
      place();
    }, () => onStick?.({ x: s.pos.x, y: s.pos.y, rotate: s.pos.rot }));
    const el = bodyRef.current;
    if (el && !REDUCED()) {
      el.dataset.sticking = "1";
      setTimeout(() => { if (bodyRef.current) delete bodyRef.current.dataset.sticking; }, 900);
    }
    try { navigator.vibrate?.(12); } catch { /* not supported */ }
    setPhase("stuck");
  };

  // After moving into / within the portal, restore position and the current curl
  useIsoLayoutEffect(() => {
    const s = st.current;
    if (phase === "sheet") return;
    place();
    draw(s.G, s.P);
    if (phase === "held") {
      // The fold springs flat as it comes off, and the sticker glides under the pointer
      const fromP: Point = [s.P[0], s.P[1]], fromC: Point = [s.carry[0], s.carry[1]];
      tween(200, (t) => {
        const e = easeOutCubic(t);
        s.P = [lerp(fromP[0], s.G[0], e), lerp(fromP[1], s.G[1], e)];
        s.carry = [fromC[0] * (1 - e), fromC[1] * (1 - e)];
        draw(s.G, s.P);
        place();
      }, () => { s.P = [s.G[0], s.G[1]]; s.carry = [0, 0]; draw(s.G, s.G); place(); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, layer]);

  /* ---------------------------------------------------------------- render */
  const m = maskStyle(src);
  const body = (
    <div
      ref={bodyRef}
      className="pas-body"
      data-phase={phase}
      role="img"
      aria-label={alt || undefined}
      onPointerDown={onPointerDown}
      style={{ width: w, height: h, pointerEvents: "auto" }}
    >
      <div className="pas-lift">
        <div ref={faceRef} className="pas-face" style={m}>
          <img src={src} alt="" draggable={false} />
          <div className="pas-gloss" />
          <div ref={creaseRef} className="pas-ov" />
        </div>
        <div ref={flapWrapRef} className="pas-flapwrap">
          <div ref={flapRef} className="pas-flap" style={m}>
            <div ref={curlRef} className="pas-ov" />
          </div>
        </div>
      </div>
    </div>
  );

  const hiddenSlot = phase !== "sheet" && !keepSpace;
  return (
    <span
      ref={slotRef}
      className={["pas-slot", className].filter(Boolean).join(" ")}
      style={{
        width: hiddenSlot ? 0 : w,
        height: hiddenSlot ? 0 : h,
        rotate: `${rotate}deg`,
        ...style,
      }}
    >
      {linerState === "on" && (
        <span className="pas-liner">
          <LinerFace src={src} />
        </span>
      )}
      {falling && layer && createPortal(<FallingLiner src={src} info={falling} onDone={() => setFalling(null)} />, layer)}
      {phase === "sheet" ? body : layer ? createPortal(body, layer) : null}
    </span>
  );
}
