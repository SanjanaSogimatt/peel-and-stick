import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Sticker } from "./Sticker";
import { stickerize, StickerizeError } from "./stickerize";
import type { StickerArt } from "./types";
import { ensureStyles, useIsoLayoutEffect } from "./styles";

export interface StickerMakerSample { name: string; svg: string }

export interface StickerMakerProps {
  /** Sample SVGs people can try without uploading. Pass [] to hide them. */
  samples?: StickerMakerSample[];
  /** Show a "Download PNG" button. Turn off where downloads are blocked. Default true. */
  allowDownload?: boolean;
  /** Called every time a sticker is (re)made. */
  onCreate?: (art: StickerArt) => void;
  className?: string;
  style?: React.CSSProperties;
}

const ROCKET = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M50 4c18 14 26 34 24 60H26C24 38 32 18 50 4z" fill="#f4f1ff"/><path d="M50 4c18 14 26 34 24 60H62C64 40 60 20 50 4z" fill="#d9d0ff"/><circle cx="50" cy="38" r="10" fill="#4d7cff" stroke="#24263a" stroke-width="4"/><path d="M26 52L10 78l18-4zM74 52l16 26-18-4z" fill="#ff4f9a"/><path d="M36 64h28l-4 12H40z" fill="#24263a"/><path d="M42 78c0 14 8 26 8 34 0-8 8-20 8-34z" fill="#ffd43b"/><path d="M46 78c0 9 4 16 4 22 0-6 4-13 4-22z" fill="#ff7a2f"/></svg>`;
const PLANET = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 100"><ellipse cx="70" cy="56" rx="64" ry="16" fill="none" stroke="#ffd43b" stroke-width="7" transform="rotate(-14 70 56)"/><circle cx="70" cy="50" r="34" fill="#2fd3a0"/><path d="M48 40c8-4 14 2 20 0s10-8 18-4" stroke="#1d9e78" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="84" cy="62" r="6" fill="#1d9e78"/><path d="M36 56a64 16 0 0 0 68 6" fill="none" stroke="#ffd43b" stroke-width="7" transform="rotate(-14 70 56)"/></svg>`;
const BOLT_WORD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 80"><rect x="4" y="10" width="172" height="60" rx="30" fill="#ff4f9a"/><circle cx="40" cy="40" r="18" fill="#fff"/><path d="M44 24L32 42h9l-4 15 12-19h-9z" fill="#ff4f9a"/><rect x="68" y="32" width="90" height="16" rx="8" fill="#fff"/></svg>`;

const DEFAULT_SAMPLES: StickerMakerSample[] = [
  { name: "rocket", svg: ROCKET },
  { name: "planet", svg: PLANET },
  { name: "toggle", svg: BOLT_WORD },
];

const COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Ink", value: "#1d1b22" },
  { name: "Sunshine", value: "#ffd43b" },
  { name: "Bubblegum", value: "#ff9cc6" },
  { name: "Silver", value: "#d9dde3" },
];

const CSS = `
.pas-maker{--pm-ink:#1d1b22;--pm-soft:#5d5866;--pm-line:rgba(29,27,34,.12);--pm-bg:#fff;--pm-accent:#4d7cff;--pm-ease:cubic-bezier(.22,1,.36,1);
  display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:24px;color:var(--pm-ink);font:inherit}
.pas-maker *{box-sizing:border-box}
.pas-maker-stage{position:relative;min-height:380px;border-radius:24px;background:var(--pm-bg);box-shadow:0 0 0 1px var(--pm-line);display:flex;align-items:center;justify-content:center;padding:32px;overflow:visible}
.pas-maker-stage.drag{box-shadow:0 0 0 3px var(--pm-accent);background:#f5f8ff}
.pas-maker-drop{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;max-width:320px}
.pas-maker-drop svg{width:48px;height:48px;color:var(--pm-accent)}
.pas-maker-drop b{font-size:20px;line-height:28px;font-weight:600}
.pas-maker-drop span{font-size:14px;line-height:20px;color:var(--pm-soft)}
.pas-maker-skel{width:180px;height:180px;border-radius:40% 55% 45% 50%;background:linear-gradient(100deg,#eef0f4 30%,#f8f9fb 50%,#eef0f4 70%) 0 0/300% 100%;animation:pas-skel 1.2s var(--pm-ease) infinite}
@keyframes pas-skel{to{background-position:-150% 0}}
.pas-maker-panel{display:flex;flex-direction:column;gap:16px;padding:24px;border-radius:24px;background:var(--pm-bg);box-shadow:0 0 0 1px var(--pm-line);min-width:0}
.pas-maker-row{display:flex;flex-direction:column;gap:8px}
.pas-maker-row>label,.pas-maker-label{display:flex;justify-content:space-between;font-size:14px;line-height:20px;font-weight:600}
.pas-maker-row output{font-variant-numeric:tabular-nums;color:var(--pm-soft);font-weight:500}
.pas-maker input[type=range]{width:100%;accent-color:var(--pm-accent)}
.pas-maker-swatches{display:flex;gap:8px;flex-wrap:wrap}
.pas-maker-swatch{width:32px;height:32px;border-radius:9999px;border:0;cursor:pointer;box-shadow:0 0 0 1px var(--pm-line);transition:transform 300ms var(--pm-ease)}
.pas-maker-swatch:hover{transform:scale(1.08)}
.pas-maker-swatch[aria-pressed=true]{box-shadow:0 0 0 2px var(--pm-bg),0 0 0 4px var(--pm-ink)}
.pas-maker-check{display:flex;align-items:center;gap:8px;font-size:14px;line-height:20px;font-weight:600;cursor:pointer}
.pas-maker-check input{width:18px;height:18px;accent-color:var(--pm-accent)}
.pas-maker-btns{display:flex;gap:8px;flex-wrap:wrap}
.pas-maker-btn{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:12px;border:0;cursor:pointer;font:600 14px/20px inherit;font-family:inherit;background:var(--pm-ink);color:#fff;transition:transform 300ms var(--pm-ease),opacity 300ms var(--pm-ease)}
.pas-maker-btn:hover{transform:translateY(-1px)}
.pas-maker-btn:active{transform:scale(.98)}
.pas-maker-btn.ghost{background:transparent;color:var(--pm-ink);box-shadow:0 0 0 1px var(--pm-line)}
.pas-maker-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.pas-maker-btn:focus-visible,.pas-maker-swatch:focus-visible,.pas-maker input:focus-visible{outline:3px solid var(--pm-accent);outline-offset:2px}
.pas-maker-samples{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:14px;line-height:20px;color:var(--pm-soft)}
.pas-maker-textarea{width:100%;min-height:96px;resize:vertical;padding:12px;border-radius:12px;border:0;box-shadow:0 0 0 1px var(--pm-line);background:#faf8f4;color:var(--pm-ink);font:13px/20px ui-monospace,SFMono-Regular,Menlo,monospace;transition:box-shadow 300ms var(--pm-ease)}
.pas-maker-textarea:focus{outline:0;box-shadow:0 0 0 2px var(--pm-accent);background:#fff}
.pas-maker-codehint{font-size:12px;line-height:16px;color:var(--pm-soft)}
.pas-maker-stage:focus-visible{outline:3px solid var(--pm-accent);outline-offset:2px}
.pas-maker-msg{font-size:14px;line-height:20px;min-height:20px;color:var(--pm-soft)}
.pas-maker-msg.err{color:#c4285e}
.pas-maker-code{background:var(--pm-ink);color:#f1ecfb;border-radius:12px;padding:12px;font:13px/20px ui-monospace,SFMono-Regular,Menlo,monospace;overflow-x:auto;white-space:pre;margin:0}
.pas-maker-hint{position:absolute;left:16px;top:16px;font-size:12px;line-height:16px;font-weight:600;color:var(--pm-soft);background:rgba(29,27,34,.05);padding:4px 8px;border-radius:9999px}
.pas-maker-vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:860px){.pas-maker{grid-template-columns:minmax(0,1fr)}.pas-maker-stage{min-height:300px}}
@media (prefers-reduced-motion:reduce){.pas-maker-skel{animation:none}}
`;
let cssIn = false;
const ensureMakerCss = () => {
  if (cssIn || typeof document === "undefined") return;
  cssIn = true;
  const el = document.createElement("style");
  el.id = "peel-and-stick-maker-styles";
  el.textContent = CSS;
  document.head.appendChild(el);
};

const UploadIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 34h-2a8 8 0 0 1-1-16 12 12 0 0 1 23-3 9 9 0 0 1 4 18h-4" /><path d="M24 40V22m-7 7l7-7 7 7" />
  </svg>
);

/** Drop an SVG or PNG and get a peelable die-cut sticker, with controls for the border, size and tilt. */
export function StickerMaker({ samples = DEFAULT_SAMPLES, allowDownload = true, onCreate, className, style }: StickerMakerProps) {
  useIsoLayoutEffect(() => { ensureStyles(); ensureMakerCss(); }, []);
  const uid = useId().replace(/:/g, "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<{ data: File | string; name: string } | null>(null);
  const [art, setArt] = useState<StickerArt | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [border, setBorder] = useState(10);
  const [color, setColor] = useState(COLORS[0].value);
  const [fillHoles, setFillHoles] = useState(true);
  const [size, setSize] = useState(220);
  const [tilt, setTilt] = useState(-6);
  const [round, setRound] = useState(0); // remounts the preview after a peel
  const job = useRef(0);
  const [code, setCode] = useState("");
  const [codeHint, setCodeHint] = useState("");

  // Pasted SVG code turns into a sticker as soon as it's complete
  useEffect(() => {
    const text = code.trim();
    if (!text) { setCodeHint(""); return; }
    const t = setTimeout(() => {
      if (!/<svg[\s>]/i.test(text)) { setCodeHint("That doesn't look like SVG code. It should start with <svg."); return; }
      if (!/<\/svg>\s*$/i.test(text)) { setCodeHint("Paste the whole SVG, from <svg to </svg>."); return; }
      setCodeHint("");
      setArt(null);
      setSource({ data: text, name: "pasted-svg" });
    }, 300);
    return () => clearTimeout(t);
  }, [code]);

  // Re-make the sticker whenever the source or the cut settings change
  useEffect(() => {
    if (!source) return;
    const id = ++job.current;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const out = await stickerize(source.data, { border, borderColor: color, fillHoles, size: 240 });
        if (id !== job.current) return;
        out.name = source.name;
        setArt(out);
        setMsg(null);
        onCreate?.(out);
      } catch (e) {
        if (id !== job.current) return;
        setMsg({ text: e instanceof StickerizeError ? e.message : "Something went wrong while making the sticker. Try another file.", err: true });
      } finally {
        if (id === job.current) setBusy(false);
      }
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, border, color, fillHoles]);

  const take = useCallback((file?: File | null) => {
    if (!file) return;
    setArt(null);
    setSource({ data: file, name: slug(file.name.replace(/\.[^.]+$/, "")) });
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    take(e.dataTransfer.files?.[0]);
  };

  const snippet = art
    ? `<Sticker\n  src="/stickers/${art.name || "my-sticker"}.png"\n  width={${size}}\n  rotate={${tilt}}\n/>`
    : "";

  const copy = async () => {
    try { await navigator.clipboard.writeText(snippet); setMsg({ text: "Code copied. Save the PNG to /public/stickers to match the path." }); }
    catch { setMsg({ text: "Your browser blocked copying. Select the code below and copy it.", err: true }); }
  };

  const download = () => {
    if (!art) return;
    const a = document.createElement("a");
    a.href = art.src;
    a.download = `${art.name || "sticker"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setMsg({ text: `Saved ${a.download}.` });
  };

  return (
    <div className={["pas-maker", className].filter(Boolean).join(" ")} style={style}>
      <div
        className={`pas-maker-stage${drag ? " drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onPaste={(e) => {
          const file = e.clipboardData.files?.[0];
          if (file) { e.preventDefault(); take(file); return; }
          const text = e.clipboardData.getData("text");
          if (/<svg[\s>]/i.test(text)) { e.preventDefault(); setCode(text); }
        }}
        tabIndex={0}
        aria-label="Sticker preview. Drop or paste an SVG here."
        aria-busy={busy}
      >
        {art && !busy && <span className="pas-maker-hint">Peel it, stick it anywhere</span>}
        {busy && !art && <div className="pas-maker-skel" aria-label="Making your sticker" />}
        {art && (
          <div style={{ opacity: busy ? 0.6 : 1, transition: "opacity 300ms cubic-bezier(.22,1,.36,1)" }}>
            <Sticker key={`${art.src.length}-${art.src.slice(-24)}-${size}-${tilt}-${round}`} art={art} width={size * (art.width / Math.max(art.width, art.height))} rotate={tilt} alt={`${art.name} sticker`} />
          </div>
        )}
        {!art && !busy && (
          <label className="pas-maker-drop" htmlFor={`${uid}-file`} style={{ cursor: "pointer" }}>
            <UploadIcon />
            <b>Drop an SVG here</b>
            <span>Click to choose a file, or paste SVG code. PNGs with a transparent background work too. Up to 2 MB.</span>
          </label>
        )}
      </div>

      <div className="pas-maker-panel">
        <input ref={fileRef} id={`${uid}-file`} className="pas-maker-vh" type="file" accept=".svg,image/svg+xml,image/png,image/webp"
               onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="pas-maker-btns">
          <button className="pas-maker-btn" type="button" onClick={() => fileRef.current?.click()}>Upload SVG or PNG</button>
          {art && <button className="pas-maker-btn ghost" type="button" onClick={() => setRound((r) => r + 1)}>Reset sticker</button>}
        </div>
        <div className="pas-maker-row">
          <label htmlFor={`${uid}-code`}>Or paste SVG code</label>
          <textarea
            id={`${uid}-code`}
            className="pas-maker-textarea"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">…</svg>'}
            spellCheck={false}
            rows={4}
          />
          <span className="pas-maker-codehint" aria-live="polite">{codeHint || "Tip: in Figma, right click a frame and choose Copy as SVG."}</span>
        </div>
        {samples.length > 0 && (
          <div className="pas-maker-samples">
            Or try
            {samples.map((s) => (
              <button key={s.name} className="pas-maker-btn ghost" type="button" onClick={() => { setArt(null); setSource({ data: s.svg, name: s.name }); }}>{s.name}</button>
            ))}
          </div>
        )}

        <div className="pas-maker-row">
          <label htmlFor={`${uid}-border`}>Border <output>{border}px</output></label>
          <input id={`${uid}-border`} type="range" min={0} max={22} value={border} onChange={(e) => setBorder(+e.target.value)} />
        </div>
        <div className="pas-maker-row">
          <span className="pas-maker-label" id={`${uid}-color`}>Border color</span>
          <div className="pas-maker-swatches" role="group" aria-labelledby={`${uid}-color`}>
            {COLORS.map((c) => (
              <button key={c.value} type="button" className="pas-maker-swatch" style={{ background: c.value }} aria-label={c.name} aria-pressed={color === c.value} onClick={() => setColor(c.value)} />
            ))}
          </div>
        </div>
        <label className="pas-maker-check">
          <input type="checkbox" checked={fillHoles} onChange={(e) => setFillHoles(e.target.checked)} /> Fill holes inside the shape
        </label>
        <div className="pas-maker-row">
          <label htmlFor={`${uid}-size`}>Size <output>{size}px</output></label>
          <input id={`${uid}-size`} type="range" min={120} max={300} step={10} value={size} onChange={(e) => setSize(+e.target.value)} />
        </div>
        <div className="pas-maker-row">
          <label htmlFor={`${uid}-tilt`}>Tilt <output>{tilt}°</output></label>
          <input id={`${uid}-tilt`} type="range" min={-20} max={20} value={tilt} onChange={(e) => setTilt(+e.target.value)} />
        </div>

        {art && <pre className="pas-maker-code" aria-label="Code for this sticker">{snippet}</pre>}
        <div className="pas-maker-btns">
          <button className="pas-maker-btn" type="button" disabled={!art} onClick={copy}>Copy code</button>
          {allowDownload && <button className="pas-maker-btn ghost" type="button" disabled={!art} onClick={download}>Download PNG</button>}
        </div>
        <p className={`pas-maker-msg${msg?.err ? " err" : ""}`} aria-live="polite">{msg?.text}</p>
      </div>
    </div>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "my-sticker";
