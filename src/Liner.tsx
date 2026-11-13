import React, { useEffect, useRef } from "react";

const mask = (src: string): React.CSSProperties => {
  const url = `url("${src.replace(/"/g, '\\"')}")`;
  return { WebkitMaskImage: url, maskImage: url };
};

/** One side of the backing paper. `back` = the printed paper side you see when it flips. */
export function LinerFace({ src, back = false, falling = false }: { src: string; back?: boolean; falling?: boolean }) {
  return (
    <span className={`pas-lf ${back ? "pas-lf-back" : "pas-lf-front"}${falling ? " pas-lf-falling" : ""}`}>
      <span className="pas-lf-s" style={back ? { ...mask(src), transform: "scaleX(-1)" } : mask(src)} />
    </span>
  );
}

export interface FallInfo {
  /** Page centre */
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  z: number;
}

/**
 * The backing paper after the sticker comes off: a small tug upward, then it
 * flutters down like real paper (swaying side to side, tilting so you glimpse
 * the printed back, drifting at a terminal speed) until it leaves the screen.
 */
export function FallingLiner({ src, info, onDone }: { src: string; info: FallInfo; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { onDone(); return; }

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const size = Math.max(info.w, info.h);
    const vt = rnd(260, 340) * Math.min(1.25, Math.max(0.8, 140 / size)); // small bits fall a bit faster
    const tau = 0.32;
    const amp = rnd(28, 60), w1 = rnd(3.2, 4.4), ph = rnd(0, Math.PI * 2);
    const drift = dir * rnd(10, 40);
    const spin = dir * rnd(8, 30);
    const flipX = rnd(80, 140), flipY = rnd(25, 50); // big enough to flip and show the paper back
    // The paper falls in screen space (position: fixed), so it never makes the page longer
    const sx = info.x - window.scrollX, sy = info.y - window.scrollY;
    const bottom = window.innerHeight + size;
    const t0 = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      const ramp = 1 - Math.exp(-t * 2.2);                 // sway builds up as it falls
      const tug = -16 * Math.sin(Math.min(t / 0.2, 1) * Math.PI) * (t < 0.2 ? 1 : 0); // quick lift
      const y = sy + vt * (t - tau * (1 - Math.exp(-t / tau))) + tug;
      const s = Math.sin(w1 * t + ph);
      const x = sx + amp * ramp * (s - Math.sin(ph)) + drift * t;
      const rz = info.rot + spin * t + 22 * ramp * Math.cos(w1 * t + ph);   // swings with the sway
      const rx = flipX * ramp * Math.sin(w1 * 0.5 * t + ph);               // tips forward/back
      const ry = flipY * ramp * Math.sin(w1 * 0.75 * t);
      el.style.transform =
        `translate(${x - info.w / 2}px,${y - info.h / 2}px) perspective(700px) rotateZ(${rz}deg) rotateX(${rx}deg) rotateY(${ry}deg)`;
      // A little darker when tilted away from the light
      el.style.setProperty("--shade", String(Math.min(0.12, Math.abs(Math.sin((rx * Math.PI) / 180)) * 0.1 + Math.abs(ry) / 600)));
      if (y - size > bottom || t > 7) { onDone(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      className="pas-falling"
      style={{
        width: info.w,
        height: info.h,
        zIndex: info.z,
        transform: `translate(${info.x - info.w / 2 - (typeof window !== "undefined" ? window.scrollX : 0)}px,${info.y - info.h / 2 - (typeof window !== "undefined" ? window.scrollY : 0)}px) rotate(${info.rot}deg)`,
      }}
    >
      <LinerFace src={src} falling />
      <LinerFace src={src} back falling />
    </div>
  );
}
