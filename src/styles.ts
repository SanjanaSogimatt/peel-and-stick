const CSS = `
.pas-slot{position:relative;display:inline-block;vertical-align:middle;flex:none;touch-action:none}
.pas-body{position:absolute;left:0;top:0;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;-webkit-tap-highlight-color:transparent}
.pas-body[data-phase="held"]{cursor:grabbing}
.pas-body[data-phase="sheet"]{inset:0}
.pas-lift{position:absolute;inset:0;transform-origin:center;
  filter:drop-shadow(0 1px 1px rgba(20,24,31,.18)) drop-shadow(0 2px 3px rgba(20,24,31,.08));
  transition:transform 420ms cubic-bezier(.34,1.56,.64,1),filter 380ms ease}
.pas-body[data-phase="held"] .pas-lift{transform:scale(1.035);
  filter:drop-shadow(var(--s1x,0) var(--s1y,3px) 3px rgba(20,24,31,.16)) drop-shadow(var(--s2x,0) var(--s2y,10px) 12px rgba(20,24,31,.12));
  transition:transform 260ms cubic-bezier(.34,1.56,.64,1),filter 260ms ease}
.pas-body[data-press="1"] .pas-lift{transform:scale(.975);transition:transform 90ms ease-out,filter 120ms ease-out}
.pas-body[data-sticking="1"] .pas-lift{animation:pas-stick 560ms cubic-bezier(.2,.7,.3,1) both}
.pas-body[data-sticking="1"] .pas-gloss{animation:pas-shine 700ms cubic-bezier(.3,.6,.3,1) 110ms both}
@keyframes pas-stick{
  0%{transform:scale(1.035);filter:drop-shadow(var(--s1x,0) var(--s1y,3px) 3px rgba(20,24,31,.16)) drop-shadow(var(--s2x,0) var(--s2y,10px) 12px rgba(20,24,31,.12))}
  38%{transform:scale(.955,.94);filter:drop-shadow(0 0 0 rgba(20,24,31,0)) drop-shadow(0 .5px .5px rgba(20,24,31,.4))}
  62%{transform:scale(1.02);filter:drop-shadow(0 2px 3px rgba(20,24,31,.12)) drop-shadow(0 1px 1px rgba(20,24,31,.22))}
  82%{transform:scale(.995)}
  100%{transform:scale(1);filter:drop-shadow(0 1px 1px rgba(20,24,31,.18)) drop-shadow(0 2px 3px rgba(20,24,31,.08))}}
@keyframes pas-shine{0%{background-position:100% 0;opacity:1}100%{background-position:0 0;opacity:.55}}
.pas-face{position:absolute;inset:0;overflow:hidden;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.pas-face>img{display:block;width:100%;height:100%;pointer-events:none;-webkit-user-drag:none;user-select:none}
.pas-gloss{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;opacity:.55;
  background:linear-gradient(115deg,rgba(255,255,255,0) 38%,rgba(255,255,255,.55) 47%,rgba(255,255,255,.12) 52%,rgba(255,255,255,0) 60%) 100% 0/280% 100% no-repeat;
  transition:background-position 900ms cubic-bezier(.2,.8,.2,1),opacity 300ms}
.pas-body[data-phase="held"] .pas-gloss{background-position:0 0;opacity:.8}
.pas-ov{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none}
.pas-flapwrap{position:absolute;inset:0;transform-origin:0 0;visibility:hidden;pointer-events:none}
.pas-flap{position:absolute;inset:0;overflow:hidden;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
  background:
    linear-gradient(118deg,rgba(255,255,255,0) 34%,rgba(255,255,255,.9) 44%,rgba(255,255,255,0) 52%),
    linear-gradient(160deg,rgba(214,232,255,.35),rgba(255,226,244,.25) 55%,rgba(220,255,240,.3)),
    linear-gradient(180deg,#fbfcfd,#e7ebef)}
.pas-liner{position:absolute;inset:0;pointer-events:none}
.pas-lf{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.pas-lf-front{filter:drop-shadow(3px 0 0 #edf0f3) drop-shadow(-3px 0 0 #edf0f3) drop-shadow(0 3px 0 #edf0f3) drop-shadow(0 -3px 0 #edf0f3) drop-shadow(0 .6px 0 rgba(20,24,31,.22)) drop-shadow(0 1px 1.5px rgba(20,24,31,.14))}
.pas-lf-back{transform:rotateY(180deg);filter:drop-shadow(3px 0 0 #ebe5d8) drop-shadow(-3px 0 0 #ebe5d8) drop-shadow(0 3px 0 #ebe5d8) drop-shadow(0 -3px 0 #ebe5d8) drop-shadow(0 .6px 0 rgba(60,50,30,.25))}
.pas-lf-falling.pas-lf-front{filter:drop-shadow(3px 0 0 #edf0f3) drop-shadow(-3px 0 0 #edf0f3) drop-shadow(0 3px 0 #edf0f3) drop-shadow(0 -3px 0 #edf0f3) drop-shadow(0 .6px 0 rgba(20,24,31,.25)) drop-shadow(0 6px 8px rgba(20,24,31,.12))}
.pas-lf-s{position:absolute;inset:0;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
/* glossy silicone release coating on the side the sticker sat on */
.pas-lf-front .pas-lf-s{background:
  linear-gradient(rgba(20,24,31,var(--shade,0)),rgba(20,24,31,var(--shade,0))),
  linear-gradient(118deg,rgba(255,255,255,.95) 0%,rgba(255,255,255,.25) 22%,rgba(255,255,255,0) 36%,rgba(255,255,255,.7) 46%,rgba(255,255,255,.1) 52%,rgba(255,255,255,0) 60%,rgba(255,255,255,.35) 82%,rgba(255,255,255,0) 92%),
  url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\"),
  linear-gradient(180deg,#fbfcfd 0%,#eff2f5 60%,#e6eaee 100%)}
/* plain paper side with the faint print real backings have */
.pas-lf-back .pas-lf-s{background:
  linear-gradient(rgba(60,50,30,var(--shade,0)),rgba(60,50,30,var(--shade,0))),
  repeating-linear-gradient(135deg,rgba(140,125,95,.13) 0 1px,rgba(0,0,0,0) 1px 9px),
  url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\"),
  linear-gradient(180deg,#f2ede2,#e3dccc)}
.pas-falling{position:fixed;left:0;top:0;pointer-events:none;transform-style:preserve-3d;will-change:transform}
.pas-sheet{position:relative;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:28px;padding:36px;border-radius:24px;
  background:
    linear-gradient(125deg,rgba(255,255,255,.9) 0%,rgba(255,255,255,0) 30%,rgba(255,255,255,0) 62%,rgba(255,255,255,.55) 70%,rgba(255,255,255,0) 78%),
    linear-gradient(180deg,#f7f8fa,#e9edf1);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.95),inset 0 0 0 1px rgba(20,24,31,.06),0 1px 2px rgba(20,24,31,.06),0 18px 40px -22px rgba(20,24,31,.35)}
.pas-grabbing,.pas-grabbing *{user-select:none!important;-webkit-user-select:none!important;cursor:grabbing!important}
@media (prefers-reduced-motion:reduce){.pas-body[data-sticking="1"] .pas-lift,.pas-body[data-sticking="1"] .pas-gloss{animation:none}.pas-lift,.pas-gloss{transition:none}}
`;

let injected = false;
export function ensureStyles() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  if (document.getElementById("peel-and-stick-styles")) return;
  const el = document.createElement("style");
  el.id = "peel-and-stick-styles";
  el.textContent = CSS;
  document.head.appendChild(el);
}

import { useEffect, useLayoutEffect } from "react";
/** useLayoutEffect in the browser, useEffect on the server (no SSR warning). */
export const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
