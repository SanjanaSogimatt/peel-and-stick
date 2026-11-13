"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sticker, StickerSheet, star, heart, hello, bolt, shipIt, coffee, wip, cloud, allStickers } from "../../src";
import { StickerMaker, stickerize } from "../../src/maker";
import type { StickerArt } from "../../src";
import { wordmark } from "../wordmark";

const INSTALL = "npm i peel-and-stick";

/* ---------------- icons (Phosphor-style, 1.5 stroke) ---------------- */
const Copy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
  </svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
const Refresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.7" /><path d="M20 4v4.7h-4.7" />
  </svg>
);
const CurlyArrow = () => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8c14 0 26 6 30 22" /><path d="M29 26l7 6 5-8" />
  </svg>
);

/* ---------------- install box with copy ---------------- */
function Install({ id }: { id: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const codeRef = useRef<HTMLElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const copy = () => {
    const done = (s: "copied" | "manual") => {
      setState(s);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState("idle"), 2400);
    };
    const select = () => {
      const r = document.createRange();
      if (codeRef.current) { r.selectNodeContents(codeRef.current); const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r); }
      done("manual");
    };
    try {
      if (!navigator.clipboard) return select();
      navigator.clipboard.writeText(INSTALL).then(() => done("copied"), select);
    } catch { select(); }
  };
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: "100%" }}>
      <div className="install">
        <code ref={codeRef} id={id}><span className="dim">$ </span>{INSTALL}</code>
        <button className="btn" onClick={copy} aria-describedby={`${id}-note`}>
          {state === "copied" ? <Check /> : <Copy />}
          {state === "copied" ? "Copied" : "Copy install command"}
        </button>
      </div>
      <p className="install-note" id={`${id}-note`} aria-live="polite">
        {state === "copied" && "Copied to your clipboard. Paste it in your project's terminal."}
        {state === "manual" && `Your browser blocked copying. The command is selected, press ${mac ? "Cmd" : "Ctrl"}+C.`}
      </p>
    </div>
  );
}

type Page = "home" | "stickers" | "docs" | "other";
function pageFor(path: string | null): Page {
  if (path === "/") return "home";
  if (path?.startsWith("/stickers")) return "stickers";
  if (path?.startsWith("/docs")) return "docs";
  return "other";
}
const hrefFor = (id: string) => (id === "stickers" ? "/stickers" : id === "docs" ? "/docs" : id === "install" ? "#install" : `/#${id}`);

/* ---------------- logo ---------------- */
function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="logo-mark">
      <path d="M10 4h28a6 6 0 0 1 6 6v20L30 44H10a6 6 0 0 1-6-6V10a6 6 0 0 1 6-6z" fill="#fff" />
      <path d="M11 8h26a3 3 0 0 1 3 3v18L29 40H11a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z" fill="#ff4f9a" />
      <path d="M24 13l3.3 6.8 7.4.8-5.5 5 1.5 7.3L24 29.2l-6.7 3.7 1.5-7.3-5.5-5 7.4-.8z" fill="#ffd43b" stroke="#18161d" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M44 30L30 44c1-6 0-10-2-12 4 1 10 0 16-2z" fill="#eef1f4" stroke="#d5dbe2" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------- nav ---------------- */
const LINKS = [
  { id: "playground", label: "Playground" },
  { id: "make", label: "Make a sticker" },
  { id: "faq", label: "FAQ" },
  { id: "stickers", label: "Stickers" },
  { id: "docs", label: "Docs" },
];
const HOME_SECTION_IDS = ["playground", "make", "faq"];

export function Nav() {
  const page = pageFor(usePathname());
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const [section, setSection] = useState("");
  const active = page === "stickers" || page === "docs" ? page : page === "home" ? section : "";
  const setActive = setSection;
  useEffect(() => {
    if (page !== "home") return;
    const updateActive = () => {
      if (window.scrollY < 120) {
        setActive("");
        return;
      }

      const threshold = window.innerHeight * 0.35;
      let current = "";
      for (const id of HOME_SECTION_IDS) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= threshold) current = id;
      }
      setActive(current);
    };
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActive);
    };
    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [page]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);
  return (
    <>
      <header className={`topbar${scrolled ? " scrolled" : ""}`}>
        <div className="topbar-inner">
          <Link className="brand" href="/" aria-label="peel-and-stick home">
            <LogoMark size={32} />
            <span>peel-and-stick</span>
          </Link>
          <nav className="nav-links" aria-label="Main">
            {LINKS.map((l) => (
              <Link key={l.id} href={hrefFor(l.id)} aria-current={active === l.id ? "true" : undefined}>{l.label}</Link>
            ))}
          </nav>
          <a className="btn small topbar-cta" href="#install">Install</a>
          <button className="menu-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="menu" onClick={() => setOpen((o) => !o)}>
            <span /><span />
          </button>
        </div>
      </header>
      <div id="menu" className={`menu-panel${open ? " open" : ""}`} aria-hidden={!open}>
        {[...LINKS, { id: "install", label: "Install" }].map((l, i) => (
          <Link key={l.id} href={hrefFor(l.id)} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}
             aria-current={active === l.id ? "true" : undefined}
             style={{ transitionDelay: open ? `${Math.min(i * 60, 400)}ms` : "0ms" }}>
            {l.label}
          </Link>
        ))}
      </div>
    </>
  );
}

/* ---------------- tagline: words light up as they cross the line ---------------- */
function Tagline() {
  const ref = useRef<HTMLParagraphElement>(null);
  const text = "The internet is flat. Your website doesn't have to be.";
  useEffect(() => {
    const words = Array.from(ref.current?.querySelectorAll<HTMLElement>(".w") ?? []);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { words.forEach((w) => w.classList.add("on")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { (e.target as HTMLElement).classList.add("on"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -42% 0px" });
    words.forEach((w) => io.observe(w));
    return () => io.disconnect();
  }, []);
  return (
    <p className="tag-words" ref={ref}>
      {text.split(" ").map((w, i) => (
        <React.Fragment key={i}><span className="w">{w}</span>{" "}</React.Fragment>
      ))}
    </p>
  );
}

/* ---------------- reveal on scroll ---------------- */
/** Rises sections in as they scroll into view; re-runs on every page. */
export function Reveal() {
  const page = usePathname();
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.remove("pre"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    els.forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add("pre"); io.observe(el); }
    });
    return () => io.disconnect();
  }, [page]);
  return null;
}

/* ---------------- sections ---------------- */
const WORDS: { w: string; c: string }[] = [
  { w: "peel", c: "var(--pink)" }, { w: "stick", c: "var(--blue)" },
  { w: "swap", c: "#13a57a" }, { w: "love", c: "var(--orange)" },
];

/** The last word of the headline cycles through what people do with stickers. */
function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % WORDS.length), 2200);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span className="rot" aria-hidden="true">
      <span key={i} className="rot-word" style={{ color: WORDS[i].c }}>{WORDS[i].w}</span>
    </span>
  );
}

const RANKS: [number, string][] = [
  [0, "Just looking"], [1, "Curious"], [3, "Collector"], [6, "Professional peeler"], [10, "Sticker goblin"],
];
const rankFor = (n: number) => RANKS.reduce((r, [min, name]) => (n >= min ? name : r), RANKS[0][1]);

/** A running count of unique stickers peeled in the hero. */
function PeelMeter({ count }: { count: number }) {
  const rank = rankFor(count);
  return (
    <div className="peel-meter" aria-live="polite">
      <span key={count} className="peel-count">{count}</span>
      <span className="peel-meta">
        <span className="peel-label">{count === 1 ? "sticker peeled" : "stickers peeled"}</span>
        <span key={rank} className="peel-rank">{rank}</span>
      </span>
    </div>
  );
}

function Hero() {
  const [peeledStickers, setPeeledStickers] = useState<Set<string>>(() => new Set());
  const markPeeled = (id: string) => {
    setPeeledStickers((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };
  return (
    <section className="band hero" id="top" aria-labelledby="hero-h">
      <Sticker art={bolt} width={64} rotate={14} liner={false} className="loose" style={{ right: "4%", top: 104 }} alt="Lightning bolt sticker" onDetach={() => markPeeled("loose-bolt")} />
      <Sticker art={heart} width={72} rotate={-12} liner={false} className="loose" style={{ right: "7%", bottom: 32 }} alt="Heart sticker" onDetach={() => markPeeled("loose-heart")} />
      <Sticker art={star} width={56} rotate={16} liner={false} className="loose" style={{ left: "45%", top: 132 }} alt="Star sticker" onDetach={() => markPeeled("loose-star")} />
      <div className="wrap">
        <div className="hero-copy">
          <span className="chip"><b>New</b> Free and open source</span>
          <h1 className="h1" id="hero-h" aria-label="Stickers your users can actually peel">
            Stickers your<br />
            users can{" "}<span className="inline-sticker" aria-hidden="true"><img src={star.src} alt="" /></span><br />
            <span className="nowrap">actually <RotatingWord /></span>
          </h1>
          <p className="hero-sub">
            Real vinyl stickers for React. People peel them, stick them anywhere,
            and come back to do it again.
          </p>
          <Install id="install-top" />
          <div className="proof" aria-label="Package facts">
            <span>6.4 kB gzipped</span><span>0 dependencies</span><span>React 18 and 19</span><span>MIT licensed</span>
          </div>
        </div>
        <div className="hero-art">
          <span className="peel-hint" aria-hidden="true">go on, peel one <CurlyArrow /></span>
          <div className="sheet-stack">
            <StickerSheet>
              <Sticker art={star} width={132} rotate={-8} alt="Smiling star sticker" onDetach={() => markPeeled("sheet-star")} />
              <Sticker art={hello} width={204} rotate={5} alt="Hello sticker" onDetach={() => markPeeled("sheet-hello")} />
              <Sticker art={cloud} width={160} rotate={-4} alt="Cloud sticker" onDetach={() => markPeeled("sheet-cloud")} />
              <Sticker art={shipIt} width={136} rotate={8} alt="Ship it sticker" onDetach={() => markPeeled("sheet-ship-it")} />
              <Sticker art={coffee} width={112} rotate={-6} alt="Coffee sticker" onDetach={() => markPeeled("sheet-coffee")} />
              <Sticker art={wip} width={192} rotate={3} alt="Work in progress sticker" onDetach={() => markPeeled("sheet-wip")} />
            </StickerSheet>
          </div>
          <PeelMeter count={peeledStickers.size} />
        </div>
      </div>
    </section>
  );
}

function Strip() {
  const items = [
    ["Curls at the corner", "var(--pink)"], ["Shiny on the front", "var(--yellow)"], ["Paper on the back", "var(--mint)"],
    ["Lands with a little squish", "var(--lilac)"], ["Peels again", "var(--orange)"], ["Any shape you draw", "var(--blue)"],
  ];
  // Each half repeats the list so it's wider than any screen; the track slides
  // exactly one half, so the loop has no visible seam or gap.
  const half = (k: number) => (
    <div className="strip-half" key={k}>
      {[0, 1, 2].flatMap((r) => items.map(([t, c], i) => <span key={`${r}-${i}`}><i style={{ background: c }} />{t}</span>))}
    </div>
  );
  return (
    <div className="strip" aria-hidden="true">
      <div className="strip-track">{half(0)}{half(1)}</div>
    </div>
  );
}

const PLAIN_ROCKET = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M50 4c18 14 26 34 24 60H26C24 38 32 18 50 4z" fill="#f4f1ff"/><path d="M50 4c18 14 26 34 24 60H62C64 40 60 20 50 4z" fill="#d9d0ff"/><circle cx="50" cy="38" r="10" fill="#4d7cff" stroke="#24263a" stroke-width="4"/><path d="M26 52L10 78l18-4zM74 52l16 26-18-4z" fill="#ff4f9a"/><path d="M36 64h28l-4 12H40z" fill="#24263a"/><path d="M42 78c0 14 8 26 8 34 0-8 8-20 8-34z" fill="#ffd43b"/><path d="M46 78c0 9 4 16 4 22 0-6 4-13 4-22z" fill="#ff7a2f"/></svg>`;
const PLAIN_SRC = "data:image/svg+xml," + encodeURIComponent(PLAIN_ROCKET);

/** Before and after, made live with the real converter */
function BeforeAfter() {
  const [art, setArt] = useState<StickerArt | null>(null);
  useEffect(() => {
    let live = true;
    stickerize(PLAIN_ROCKET, { border: 9 }).then((a) => live && setArt(a)).catch(() => {});
    return () => { live = false; };
  }, []);
  return (
    <div className="ba">
      <figure>
        <img src={PLAIN_SRC} alt="A plain rocket icon" width={64} height={77} />
        <figcaption>rocket.svg</figcaption>
      </figure>
      <svg className="ba-arrow" viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h38M34 5l8 7-8 7" /></svg>
      <figure>
        {art ? <Sticker art={art} width={96} rotate={-6} alt="The rocket as a peelable sticker" /> : <span className="ba-skel" aria-label="Making the sticker" />}
        <figcaption>a sticker</figcaption>
      </figure>
    </div>
  );
}

function Pack() {
  return (
    <section className="band" aria-labelledby="pack-h">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow" style={{ color: "var(--pink)" }}>What you get</span>
          <h2 className="h2" id="pack-h">Small thing. Big grin.</h2>
        </div>
        <div className="bento">
          {/* where stickers go */}
          <article className="tile tile-wide tile-blue reveal">
            <div className="tile-copy">
              <h3>Hide one where nobody's looking</h3>
              <p>A 404 page, an empty inbox, a pricing card. One sticker turns a dead end into a little moment.</p>
            </div>
            <div className="mocks">
              <div className="mock mock-404">
                <span className="mock-dot-row" aria-hidden="true"><i /><i /><i /></span>
                <b>404</b>
                <span>This page doesn't exist</span>
                <Sticker art={cloud} width={74} rotate={-8} liner={false} className="mock-sticker" style={{ right: -18, top: -22 }} alt="Cloud sticker" />
              </div>
              <div className="mock mock-empty">
                <span className="mock-dot-row" aria-hidden="true"><i /><i /><i /></span>
                <span className="mock-line w60" /><span className="mock-line w40" />
                <span className="mock-empty-label">Inbox zero</span>
                <Sticker art={star} width={58} rotate={12} liner={false} className="mock-sticker" style={{ left: "50%", bottom: 14, marginLeft: -29 }} alt="Star sticker" />
              </div>
              <div className="mock mock-price">
                <span className="mock-plan">Pro</span>
                <b>$12<small>/mo</small></b>
                <span className="mock-line w80" /><span className="mock-line w60" />
                <span className="mock-btn">Choose Pro</span>
                <Sticker art={heart} width={52} rotate={14} liner={false} className="mock-sticker" style={{ right: -16, top: -18 }} alt="Heart sticker" />
              </div>
            </div>
          </article>

          {/* what's in the pack */}
          <article className="tile tile-caution reveal">
            <div className="caution-head">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z" fill="#18161d" /><path d="M12 10v5" stroke="#ffd43b" strokeWidth="2.4" strokeLinecap="round" /><circle cx="12" cy="18" r="1.4" fill="#ffd43b" /></svg>
              <h3>The fine print</h3>
            </div>
            <ul className="side-effects">
              <li>Works with a mouse, a finger or a pen</li>
              <li>Comes off as many times as you like</li>
              <li>Stays put while the page scrolls</li>
              <li>Calms down when motion is reduced</li>
            </ul>
            <p className="caution-fine">Leaves no residue on your website.</p>
          </article>

          {/* make your own */}
          <article className="tile tile-pink reveal">
            <h3>Bring your own art</h3>
            <p>Paste an SVG. Get a sticker.</p>
            <BeforeAfter />
            <Link className="tile-link" href="/#make">Open the sticker maker</Link>
          </article>

          {/* for developers */}
          <article className="tile tile-wide tile-ink tile-dev reveal">
            <div className="tile-copy">
              <h3>Built for people who ship</h3>
              <p>One component, typed props, nothing to configure. Works in Next.js out of the box.</p>
              <div className="proof dev-chips"><span>TypeScript</span><span>React 18 and 19</span><span>Next.js ready</span><span>6.4 kB gzipped</span></div>
            </div>
            <div className="code tile-code"><pre><span className="k">import</span> {"{ "}<span className="t">Sticker</span>, star {"}"}{"\n"}  <span className="k">from</span> <span className="s">"peel-and-stick"</span>;{"\n\n"}{"<"}<span className="t">Sticker</span> art={"{"}star{"}"} width={"{"}120{"}"} {"/>"}</pre></div>
          </article>
        </div>
      </div>
    </section>
  );
}

const ALL = [
  { art: star, w: 120, r: -8, alt: "Star" }, { art: hello, w: 190, r: 4, alt: "Hello" },
  { art: heart, w: 110, r: 9, alt: "Heart" }, { art: cloud, w: 150, r: -5, alt: "Cloud" },
  { art: shipIt, w: 130, r: 6, alt: "Ship it" }, { art: coffee, w: 110, r: -4, alt: "Coffee" },
  { art: bolt, w: 84, r: 7, alt: "Bolt" }, { art: wip, w: 180, r: -3, alt: "Work in progress" },
];

function Playground() {
  const [sheet, setSheet] = useState(0);
  // Which stickers have left the sheet. Re-peeling one that's already on the page doesn't count again.
  const [peeledSet, setPeeledSet] = useState<Set<number>>(() => new Set());
  const peeled = peeledSet.size;
  const markPeeled = (i: number) => setPeeledSet((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
  const fresh = () => { setSheet((k) => k + 1); setPeeledSet(new Set()); };
  const empty = peeled >= ALL.length;
  return (
    <section className="band playground" id="playground" aria-labelledby="pg-h">
      <div className="wrap">
        <div className="pg-head reveal">
          <div className="section-head">
            <span className="eyebrow">Playground</span>
            <h2 className="h2" id="pg-h">Go on, make a mess</h2>
            <p className="lede" style={{ color: "rgba(24,22,29,.75)" }}>Drag a sticker past its middle to pull it off, then put it anywhere on this page. Nobody's watching.</p>
          </div>
          <div className="pg-controls">
            <span className="counter" aria-live="polite">{peeled} of {ALL.length} peeled</span>
            <button className="btn light" onClick={fresh}><Refresh /> New sheet</button>
          </div>
        </div>
        <div className="pg-sheet-wrap reveal">
          <StickerSheet key={sheet}>
            {ALL.map((s, i) => (
              <Sticker key={i} art={s.art} width={s.w} rotate={s.r} alt={`${s.alt} sticker`} onDetach={() => markPeeled(i)} />
            ))}
          </StickerSheet>
          {empty && (
            <div className="empty">
              <h3>Well, that escalated quickly</h3>
              <p>All eight stickers are loose on the page. This sheet is now just a very shiny rectangle.</p>
              <button className="btn" onClick={fresh}><Refresh /> Restock the stickers</button>
            </div>
          )}
        </div>
        <p className="pg-foot">Hit New sheet to tidy up.</p>
      </div>
    </section>
  );
}

function Maker() {
  const [framed, setFramed] = useState(false); // downloads are blocked in embedded previews
  useEffect(() => setFramed(window.self !== window.top), []);
  return (
    <section className="band maker" id="make" aria-labelledby="make-h">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">Sticker maker</span>
          <h2 className="h2" id="make-h">Your logo would look great on a laptop</h2>
          <p className="lede">
            Upload a file or paste SVG code. It gets a die cut border that hugs the outline, ready to peel.
            Nothing leaves your browser.
          </p>
        </div>
        <div className="reveal">
          <StickerMaker allowDownload={!framed} />
        </div>
        <p className="pg-foot">Use it in your own app with <code>import {"{ StickerMaker }"} from "peel-and-stick/maker"</code>.</p>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="band" id="how" aria-labelledby="how-h">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow" style={{ color: "var(--blue)" }}>How it works</span>
          <h2 className="h2" id="how-h">From npm install to first peel</h2>
        </div>
        <div className="steps">
          <article className="step reveal">
            <span className="step-n" style={{ background: "var(--pink)" }}>1</span>
            <h3>Install it</h3>
            <p>One command. Nothing else to set up.</p>
            <div className="code"><pre><span className="c">$</span> npm i peel-and-stick</pre></div>
          </article>
          <article className="step reveal">
            <span className="step-n" style={{ background: "var(--yellow)" }}>2</span>
            <h3>Pick a sticker</h3>
            <p>Use a built in one, or any image with a transparent background.</p>
            <div className="code"><pre><span className="k">import</span> {"{ "}<span className="t">Sticker</span>, star {"}"}{"\n"}  <span className="k">from</span> <span className="s">"peel-and-stick"</span>;</pre></div>
          </article>
          <article className="step reveal">
            <span className="step-n" style={{ background: "var(--mint)" }}>3</span>
            <h3>Put it somewhere fun</h3>
            <p>Place it like any component. Size and tilt are props.</p>
            <div className="code"><pre>{"<"}<span className="t">Sticker</span>{"\n"}  art={"{"}star{"}"}{"\n"}  width={"{"}120{"}"}{"\n"}  rotate={"{"}-8{"}"}{"\n"}{"/>"}</pre></div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Figma() {
  return (
    <section className="band figma" id="figma" aria-labelledby="fig-h">
      <div className="wrap figma-grid">
        <div className="reveal">
          <span className="eyebrow">Make your own</span>
          <h2 className="h2" id="fig-h" style={{ marginTop: 16 }}>Design in Figma. Peel in React.</h2>
          <ul className="figma-list">
            <li><span className="dot">1</span><span>Name a frame <code>sticker/rocket</code> and give it a transparent background.</span></li>
            <li><span className="dot">2</span><span>Add a <b>personal access token</b> and your file link to <code>.env</code>.</span></li>
            <li><span className="dot">3</span><span>Run the sync. Every sticker frame becomes an import, text included.</span></li>
          </ul>
        </div>
        <div className="terminal reveal" role="img" aria-label="Terminal output of npm run figma:sync">
          <div className="terminal-bar"><i style={{ background: "var(--pink)" }} /><i style={{ background: "var(--yellow)" }} /><i style={{ background: "var(--mint)" }} /></div>
          <pre>
<span className="p">$</span> npm run figma:sync{"\n"}
Found 3 sticker(s) in "Studio stickers":{"\n"}
  rocket, happy frog, deploy friday{"\n"}
  <span className="ok">✓</span> stickers/rocket.svg{"\n"}
  <span className="ok">✓</span> stickers/happy-frog.svg{"\n"}
  <span className="ok">✓</span> stickers/deploy-friday.svg{"\n"}
build-art: 11 stickers {"->"} src/art/index.ts{"\n"}
{"\n"}
<span className="p">import</span> {"{ rocket }"} from "peel-and-stick"
          </pre>
        </div>
      </div>
    </section>
  );
}

const FAQS: [string, React.ReactNode][] = [
  ["Does it work with Next.js?", <>Yes. The package marks itself as a client component and renders on the server without errors, so it works in the App Router and the Pages Router.</>],
  ["Can I use my own sticker images?", <>Pass any image to <code>src</code>. PNG, SVG and WebP all work, and transparent pixels become the sticker's outline.</>],
  ["Do placed stickers survive a page reload?", <>No. They stay put while the page is open. If you want to remember where people stuck them, save the position from <code>onStick</code> and render them there next time.</>],
  ["Does it work on phones?", <>Yes. Peeling uses pointer events, so touch works the same as a mouse. Phones that support vibration also get a small tap when a sticker lands.</>],
  ["How big is it?", <>The sticker component with one sticker is 6.4 kB gzipped. Each sticker is its own import, so you only ship the ones you use; all of them together come to about 13 kB. The sticker maker is a separate import that adds about 8 kB, only if you use it. There are no dependencies besides React.</>],
  ["Can I turn off the falling backing?", <>Set <code>liner={"{false}"}</code> and the sticker sits straight on the page with no backing paper.</>],
  ["Can I stop people peeling a sticker?", <>Use <code>peelable={"{false}"}</code> to lock it, or <code>repeelable={"{false}"}</code> to allow one peel and then keep it where it lands.</>],
  ["What about reduced motion?", <>When someone has reduced motion turned on, the bounce, shine and falling paper are skipped. Peeling still works.</>],
  ["Can I use it in commercial projects?", <>Yes. It is MIT licensed, so you can use it in client work and paid products.</>],
];

function Faq() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section className="band" id="faq" aria-labelledby="faq-h">
      <div className="wrap faq-grid">
        <div className="section-head reveal" style={{ marginBottom: 0 }}>
          <span className="eyebrow" style={{ color: "var(--mint)" }}>FAQ</span>
          <h2 className="h2" id="faq-h">Good questions</h2>
          <p className="lede">Something missing? The README on npm covers every prop.</p>
        </div>
        <div className="faq-list reveal">
          {FAQS.map(([q, a], i) => (
            <div className="faq-item" key={i} data-open={open === i}>
              <button id={`faq-q${i}`} aria-expanded={open === i} aria-controls={`faq-a${i}`} onClick={() => setOpen(open === i ? -1 : i)}>
                {q}<span className="plus" aria-hidden="true" />
              </button>
              <div className="faq-a" id={`faq-a${i}`} role="region" aria-labelledby={`faq-q${i}`}>
                <div><p>{a}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FOOT: { title: string; color: string; links: { label: string; href?: string; modal?: "license" | "privacy" | "top" }[] }[] = [
  { title: "Product", color: "var(--yellow)", links: [
    { label: "Stickers", href: "/stickers" }, { label: "Docs", href: "/docs" },
    { label: "Playground", href: "/#playground" }, { label: "Make a sticker", href: "/#make" },
  ] },
  { title: "Resources", color: "var(--mint)", links: [
    { label: "npm package", href: "https://www.npmjs.com/package/peel-and-stick" },
    { label: "Figma sync", href: "/docs#docs-figma" }, { label: "Next.js setup", href: "/docs#docs-nextjs" }, { label: "FAQ", href: "/#faq" },
  ] },
  { title: "Legal", color: "var(--lilac)", links: [
    { label: "MIT license", modal: "license" }, { label: "Privacy", modal: "privacy" }, { label: "Back to top", modal: "top" },
  ] },
];

function LegalModal({ tab, setTab, close }: { tab: "license" | "privacy"; setTab: (t: "license" | "privacy") => void; close: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("keydown", esc); prev?.focus(); };
  }, [close]);
  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-h" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-tabs" role="tablist">
            <button role="tab" aria-selected={tab === "license"} onClick={() => setTab("license")}>MIT license</button>
            <button role="tab" aria-selected={tab === "privacy"} onClick={() => setTab("privacy")}>Privacy</button>
          </div>
          <button ref={closeRef} className="modal-x" onClick={close} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {tab === "license" ? (
          <div className="modal-body">
            <h3 id="modal-h">MIT license</h3>
            <p>peel-and-stick is free for personal and commercial use. You can use, copy, change, publish and sell it, as long as the copyright notice and license text come along.</p>
            <pre>{`MIT License

Copyright (c) 2026 peel-and-stick contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.`}</pre>
          </div>
        ) : (
          <div className="modal-body">
            <h3 id="modal-h">Privacy</h3>
            <p>This site sets no cookies and asks for no account. It uses Vercel Web Analytics to count page views. That counting is anonymous: it doesn't use cookies and doesn't identify you.</p>
            <p>Files you drop into the sticker maker are turned into stickers inside your browser. They are never uploaded, and they disappear when you leave the page.</p>
            <p>Apart from that page view count, which goes to this site's own server, the site makes no requests to other servers.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Ending() {
  const [modal, setModal] = useState<null | "license" | "privacy">(null);
  const closeModal = useCallback(() => setModal(null), []);
  const boxRef = useRef<HTMLDivElement>(null);
  const [wmWidth, setWmWidth] = useState(1000);
  const [peeledFooter, setPeeledFooter] = useState(false);
  const [footerJoke, setFooterJoke] = useState<React.ReactNode>(null);
  const peeledRef = useRef(false);
  const peelFooter = () => {
    if (peeledRef.current) return; // re-peeling the stuck wordmark keeps the same message
    peeledRef.current = true;
    const jokes: React.ReactNode[] = [
      <>You peeled the footer.<br />Nothing is holding this page up now, so scroll gently.</>,
      <>You peeled the footer.<br />My entire team (me) is looking into it.</>,
      <>You peeled the footer.<br />That one was load bearing.</>,
      <>You peeled the footer.<br />This is now the bottom of the internet. Hi.</>,
    ];
    setFooterJoke(jokes[Math.floor(Math.random() * jokes.length)]);
    setPeeledFooter(true);
  };
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => !peeledRef.current && setWmWidth(Math.round(Math.min(1180, e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <section className="band ending" id="install" aria-labelledby="final-h">
      <div className="wrap ending-top">
        <div className="ending-cta reveal">
          <span className="eyebrow" style={{ color: "var(--yellow)" }}>Free and MIT licensed</span>
          <h2 className="h2" id="final-h">Give your page something to peel</h2>
          <p>Install it in a minute. Use it anywhere, including commercial work, with no account and no signup.</p>
          <Install id="install-bottom" />
        </div>
        <nav className="ending-links reveal" aria-label="Footer">
          {FOOT.map((col, ci) => (
            <div key={col.title} className="foot-col">
              <span className="label-sticker" style={{ background: col.color, rotate: `${[-4, 3, -2][ci]}deg` }}>{col.title}</span>
              <ul>
                {col.links.map((l, li) => (
                  <li key={l.label}>
                    {l.modal ? (
                      <button className="tape-link" style={{ ["--tape" as string]: col.color }} onClick={() => (l.modal === "top" ? window.scrollTo({ top: 0, behavior: "smooth" }) : setModal(l.modal as "license" | "privacy"))}>{l.label}</button>
                    ) : (
                      l.href!.startsWith("http") ? (
                        <a className="tape-link" style={{ ["--tape" as string]: col.color }} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                      ) : (
                        <Link className="tape-link" style={{ ["--tape" as string]: col.color }} href={l.href!}>{l.label}</Link>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="wordmark-zone">
        <div className="wrap" style={{ paddingBlock: 0 }}>
          <div className="wordmark-box" ref={boxRef}>
            <p className={`under-message${peeledFooter ? " show" : ""}`} aria-hidden="true">
              {footerJoke}
            </p>
            <Sticker art={wordmark} width={wmWidth} rotate={-2} detachAt={0.5} alt="peel and stick" onDetach={peelFooter} />
            <Sticker art={star} width={78} rotate={-14} liner={false} className="wm-loose" style={{ left: "3%", top: "-18%" }} alt="Star sticker" />
            <Sticker art={heart} width={70} rotate={10} liner={false} className="wm-loose" style={{ left: "47%", top: "62%" }} alt="Heart sticker" />
            <Sticker art={bolt} width={52} rotate={12} liner={false} className="wm-loose" style={{ right: "4%", top: "-22%" }} alt="Lightning bolt sticker" />
          </div>
        </div>
      </div>

      <footer className="wrap ending-bottom">
        <small>© 2026 peel-and-stick</small>
        <small>Made with real fold physics. No cookies, just anonymous page views.</small>
      </footer>
      {modal && <LegalModal tab={modal} setTab={setModal} close={closeModal} />}
    </section>
  );
}

/* ================= Stickers page ================= */
const TINTS = ["#ffe1ee", "#fff3c4", "#e1e9ff", "#d8f7ec", "#ece5ff", "#ffe6d6"];

function CopyButton({ text, label, done = "Copied", className = "" }: { text: string; label: string; done?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const t = useRef<number | undefined>(undefined);
  const go = () => {
    const fin = (s: "ok" | "fail") => { setState(s); window.clearTimeout(t.current); t.current = window.setTimeout(() => setState("idle"), 2000); };
    try { navigator.clipboard.writeText(text).then(() => fin("ok"), () => fin("fail")); } catch { fin("fail"); }
  };
  return (
    <button className={`copy-btn ${className}`.trim()} type="button" onClick={go} aria-live="polite" title={`Copy ${label.toLowerCase()}`}>
      {state === "ok" ? <Check /> : <Copy />}
      {state === "ok" ? done : state === "fail" ? "Select and copy" : label}
    </button>
  );
}

const Sliders = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" />
  </svg>
);

/** Customize one sticker and copy exactly the code for it. */
function StickerDetail({ art, tint, start, close }: { art: StickerArt; tint: string; start: { w: number; r: number }; close: () => void }) {
  const [w, setW] = useState(start.w);
  const [r, setR] = useState(start.r);
  const [liner, setLiner] = useState(true);
  const [round, setRound] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const downOnBackdrop = useRef(false);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; prev?.focus(); };
  }, [close]);
  const importLine = `import { Sticker, ${art.name} }\n  from "peel-and-stick";`;
  const props = [`art={${art.name}}`, `width={${w}}`, r ? `rotate={${r}}` : "", liner ? "" : "liner={false}"].filter(Boolean);
  const jsx = `<Sticker\n  ${props.join("\n  ")}\n/>`;
  return (
    <div
      className="modal-backdrop"
      onPointerDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (downOnBackdrop.current && e.target === e.currentTarget) close(); }}
    >
      <div className="modal detail" role="dialog" aria-modal="true" aria-labelledby="detail-h" onClick={(e) => e.stopPropagation()}>
        <div className="detail-stage" style={{ background: tint }}>
          <Sticker key={`${w}-${r}-${liner}-${round}`} art={art} width={w} rotate={r} liner={liner} zIndex={3100} alt={`${art.name} sticker`} />
          <button className="detail-reset" type="button" onClick={() => setRound((n) => n + 1)}><Refresh /> Put it back</button>
        </div>
        <div className="detail-panel">
          <div className="detail-head">
            <div>
              <h2 id="detail-h">{art.name}</h2>
              <span>{art.width} × {art.height}</span>
            </div>
            <button ref={closeRef} className="modal-x" onClick={close} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <label className="detail-row" htmlFor="detail-w">Size <output>{w}px</output></label>
          <input id="detail-w" type="range" min={60} max={260} step={2} value={w} onChange={(e) => setW(+e.target.value)} />
          <label className="detail-row" htmlFor="detail-r">Tilt <output>{r}°</output></label>
          <input id="detail-r" type="range" min={-20} max={20} value={r} onChange={(e) => setR(+e.target.value)} />
          <label className="detail-check"><input type="checkbox" checked={liner} onChange={(e) => setLiner(e.target.checked)} /> Backing paper that falls away</label>
          <div className="doc-code detail-code"><pre>{`${importLine}\n\n${jsx}`}</pre></div>
          <div className="detail-actions">
            <CopyButton text={`${importLine}\n\n${jsx}`} label="Copy component" />
            <CopyButton text={importLine} label="Copy import" className="ghost" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StickersPage() {
  const [q, setQ] = useState("");
  const [round, setRound] = useState(0);
  const [open, setOpen] = useState<null | { art: StickerArt; tint: string; w: number; r: number }>(null);
  const closeDetail = useCallback(() => setOpen(null), []);
  const list = Object.values(allStickers);
  const shown = list.filter((a) => (a.name || "").toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <section className="band page-head">
        <div className="wrap">
          <span className="eyebrow" style={{ color: "var(--pink)" }}>Sticker library</span>
          <h1 className="page-h1">{list.length} stickers, ready to peel</h1>
          <p className="lede">Peel one to try it. Copy grabs the component, Customize lets you set the size and tilt first.</p>
          <div className="lib-tools">
            <label className="search">
              <span className="vh">Search stickers</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
              <input id="sticker-search" type="search" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <button className="btn light" type="button" onClick={() => setRound((r) => r + 1)}><Refresh /> Put them all back</button>
          </div>
        </div>
      </section>
      <section className="band" aria-label="Stickers">
        <div className="wrap" style={{ paddingTop: 0 }}>
          {shown.length === 0 ? (
            <div className="lib-empty">
              <h2>No sticker called "{q}" yet</h2>
              <p>You can make it yourself from any SVG in a few seconds.</p>
              <Link className="btn" href="/#make">Open the sticker maker</Link>
            </div>
          ) : (
            <div className="lib-grid">
              {shown.map((a) => {
                const i = list.indexOf(a);
                const fit = 120 / Math.max(a.width, a.height);
                const w = Math.round(a.width * fit);
                const r = [-6, 4, -3, 7, -5, 3, 6, -4][i % 8];
                const importLine = `import { Sticker, ${a.name} } from "peel-and-stick";`;
                const jsx = `<Sticker art={${a.name}}\n  width={${w}} rotate={${r}} />`;
                return (
                  <article className="lib-card" key={`${a.name}-${round}`}>
                    <div className="lib-stage" style={{ background: TINTS[i % TINTS.length] }}>
                      <Sticker art={a} width={w} rotate={r} alt={`${a.name} sticker`} />
                      <CopyButton text={`${importLine}\n\n${jsx}`} label="Copy" className="lib-copy" />
                    </div>
                    <div className="lib-meta">
                      <div>
                        <h3>{a.name}</h3>
                        <span>{a.width} × {a.height}</span>
                      </div>
                      <button className="lib-more-btn" type="button" onClick={() => setOpen({ art: a, tint: TINTS[i % TINTS.length], w, r })}>
                        <Sliders /> Customize
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {open && <StickerDetail art={open.art} tint={open.tint} start={{ w: open.w, r: open.r }} close={closeDetail} />}
          <div className="lib-more">
            <Link className="more-card more-pink" href="/#make"><b>Make your own</b><span>Turn any SVG into a sticker in your browser.</span></Link>
            <Link className="more-card more-blue" href="/docs#docs-figma"><b>Sync from Figma</b><span>Name frames sticker/anything and pull them in.</span></Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ================= Docs page ================= */
function Code({ children, copy }: { children: string; copy?: boolean }) {
  return (
    <div className="doc-code">
      <pre>{children}</pre>
      {copy !== false && <CopyButton text={children} label="Copy" />}
    </div>
  );
}

function PropsTable({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <div className="api-table-wrap">
      <table className="api">
        <thead><tr><th scope="col">Prop</th><th scope="col">Type</th><th scope="col">Default</th><th scope="col">Description</th></tr></thead>
        <tbody>{rows.map(([p, t, d, w]) => <tr key={p}><td><code>{p}</code></td><td><code>{t}</code></td><td><code>{d || "none"}</code></td><td>{w}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

const DOC_TOC = [
  ["docs-install", "Installation"], ["docs-quick-start", "Quick start"], ["docs-sticker", "Sticker"],
  ["docs-sheet", "StickerSheet"], ["docs-builtin", "Built in stickers"], ["docs-maker", "Sticker maker"],
  ["docs-stickerize", "stickerize()"], ["docs-figma", "Figma sync"], ["docs-nextjs", "Next.js"],
  ["docs-events", "Events"], ["docs-a11y", "Accessibility"],
];

function DocsPage() {
  const [active, setActive] = useState(DOC_TOC[0][0]);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-20% 0px -70% 0px" });
    DOC_TOC.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  const names = Object.keys(allStickers);
  return (
    <section className="band docs">
      <div className="wrap docs-grid">
        <nav className="toc" aria-label="On this page">
          <span className="toc-title">Docs</span>
          {DOC_TOC.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={active === id ? "true" : undefined}>{label}</a>)}
        </nav>
        <article className="doc">
          <span className="eyebrow" style={{ color: "var(--blue)" }}>Documentation</span>
          <h1 className="page-h1">Using peel-and-stick</h1>
          <p className="lede">Everything the package does, with code you can paste.</p>

          <h2 id="docs-install">Installation</h2>
          <p>Works with React 18 and 19. There are no other dependencies.</p>
          <Code>{`npm i peel-and-stick`}</Code>
          <p className="doc-note">Using pnpm, yarn or bun? <code>pnpm add peel-and-stick</code>, <code>yarn add peel-and-stick</code> and <code>bun add peel-and-stick</code> all work.</p>

          <h2 id="docs-quick-start">Quick start</h2>
          <p>Import a sticker and place it like any component. There is no stylesheet to import; the styles are added for you the first time a sticker renders.</p>
          <Code>{`import { Sticker, star } from "peel-and-stick";

export default function Hero() {
  return <Sticker art={star} width={120} rotate={-8} alt="Star" />;
}`}</Code>
          <p>Drag it past its middle and it comes off its backing. Drop it anywhere on the page, then grab it again to move it.</p>

          <h2 id="docs-sticker">Sticker</h2>
          <p>The main component. Pass either <code>art</code> (a built in or synced sticker) or <code>src</code> (any image URL).</p>
          <PropsTable rows={[
            ["art", "StickerArt", "", "A built in or Figma synced sticker"],
            ["src", "string", "", "Any image URL. Transparent pixels become the outline"],
            ["width", "number", "art width", "Width in pixels. Height follows the aspect ratio"],
            ["height", "number", "", "Set instead of width, or both to stretch"],
            ["rotate", "number", "0", "Tilt in degrees"],
            ["liner", "boolean", "true", "Show the backing that falls away when it comes off"],
            ["peelable", "boolean", "true", "Allow peeling at all"],
            ["repeelable", "boolean", "true", "Allow peeling again once it's been stuck"],
            ["detachAt", "number", "0.4", "Share of the sticker (0 to 1) that must be peeled before it comes off"],
            ["keepSpace", "boolean", "true", "Leave the empty spot behind on the sheet"],
            ["zIndex", "number", "1000", "z-index of the sticker once it comes off the sheet. Raise it to show a sticker above a modal"],
            ["alt", "string", "", "Accessible label"],
            ["className, style", "", "", "Applied to the sticker's spot on the page"],
          ]} />

          <h2 id="docs-sheet">StickerSheet</h2>
          <p>An optional glossy card that lays stickers out in a row and wraps them. It's purely visual.</p>
          <Code>{`import { Sticker, StickerSheet, star, heart } from "peel-and-stick";

<StickerSheet>
  <Sticker art={star} width={110} />
  <Sticker art={heart} width={100} rotate={6} />
</StickerSheet>`}</Code>
          <p>To give people a fresh sheet, change its <code>key</code>. That also removes the stickers placed from it.</p>

          <h2 id="docs-builtin">Built in stickers</h2>
          <p>Each one is its own export, so you only ship the ones you import. <code>allStickers</code> imports all of them.</p>
          <Code>{`import { ${names.join(", ")} } from "peel-and-stick";`}</Code>
          <p><Link className="inline-link" href="/stickers">Browse them in the sticker library</Link></p>

          <h2 id="docs-maker">Sticker maker</h2>
          <p>A ready made tool that turns an SVG or PNG into a sticker. People can upload a file, drop it in, or paste SVG code (for example from Figma's Copy as SVG), then adjust the border, size and tilt. It lives in its own entry point so apps that don't use it never download it.</p>
          <Code>{`import { StickerMaker } from "peel-and-stick/maker";

<StickerMaker onCreate={(art) => console.log(art)} />`}</Code>
          <PropsTable rows={[
            ["samples", "{ name, svg }[]", "3 samples", "Example SVGs to try. Pass [] to hide them"],
            ["allowDownload", "boolean", "true", "Show the Download PNG button"],
            ["onCreate", "(art) => void", "", "Called each time a sticker is made"],
            ["className, style", "", "", "Applied to the outer element"],
          ]} />

          <h2 id="docs-stickerize">stickerize()</h2>
          <p>The converter behind the maker. It runs in the browser and returns art you can pass straight to <code>Sticker</code>.</p>
          <Code>{`import { stickerize } from "peel-and-stick/maker";
import { Sticker } from "peel-and-stick";

const art = await stickerize(file, { border: 10, borderColor: "#ffffff" });
<Sticker art={art} width={200} />`}</Code>
          <PropsTable rows={[
            ["border", "number", "10", "Border thickness in pixels"],
            ["borderColor", "string", "#ffffff", "Any CSS color"],
            ["fillHoles", "boolean", "true", "Fill gaps fully enclosed by the border"],
            ["size", "number", "240", "Longest side of the finished sticker"],
            ["scale", "number", "2", "Rendering scale for sharp edges on high density screens"],
            ["maxBytes", "number", "2 MB", "Largest file accepted"],
          ]} />
          <p className="doc-note">Scripts and outside links inside uploaded SVGs are removed. Convert text to outlines first, because fonts don't load when an SVG is drawn as an image.</p>

          <h2 id="docs-figma">Figma sync</h2>
          <p>Design stickers in your own Figma file and pull them into the package as imports.</p>
          <ol className="doc-steps">
            <li>In Figma, open Settings, then Security, and create a personal access token with read access to file content.</li>
            <li>Name each sticker frame or component <code>sticker/name</code>, for example <code>sticker/rocket</code>. Use a transparent background.</li>
            <li>Add the token and your file link to a <code>.env</code> file in the package folder.</li>
          </ol>
          <Code>{`FIGMA_TOKEN=figd_your_token
FIGMA_FILE=https://www.figma.com/design/XXXX/My-Stickers`}</Code>
          <Code>{`npm run figma:sync              # download and regenerate
npm run figma:sync -- --dry     # list what it finds
npm run figma:sync -- --page "Stickers"`}</Code>

          <h2 id="docs-nextjs">Next.js</h2>
          <p>The package is marked as a client component, so you can use it from server components in the App Router without adding <code>"use client"</code> yourself. This site is built that way. It also renders on the server without errors in the Pages Router.</p>
          <Code>{`// app/page.tsx (a server component)
import { Sticker, star } from "peel-and-stick";

export default function Page() {
  return <Sticker art={star} width={120} />;
}`}</Code>

          <h2 id="docs-events">Events</h2>
          <PropsTable rows={[
            ["onPeelStart", "() => void", "", "Someone started peeling"],
            ["onDetach", "() => void", "", "It came off. Fires again each time a placed sticker is peeled"],
            ["onStick", "({ x, y, rotate }) => void", "", "Where it landed, in page coordinates"],
          ]} />
          <Code>{`<Sticker
  art={star}
  onStick={({ x, y }) => console.log("Stuck at", x, y)}
/>`}</Code>
          <p className="doc-note">Placed stickers last until the page reloads. Putting a sticker straight into a saved spot isn't supported yet.</p>

          <h2 id="docs-a11y">Accessibility</h2>
          <ul className="doc-list">
            <li>Give each sticker an <code>alt</code> label; it's announced as an image.</li>
            <li>When reduced motion is on, the bounce, shine and falling backing are skipped.</li>
            <li>Peeling needs a pointer: mouse, touch or pen. Stickers are decoration, so keep anything important out of them.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

/* ================= 404 ================= */
function NotFound() {
  return (
    <section className="band nf">
      <div className="wrap nf-wrap">
        <div className="nf-art">
          <span className="nf-code">404</span>
          <Sticker art={cloud} width={150} rotate={-10} liner={false} className="nf-sticker" alt="Cloud sticker" />
        </div>
        <h1 className="page-h1">This page doesn't exist</h1>
        <p className="lede">The link might be old, or it might have a typo.</p>
        <Link className="btn" href="/">Go to the homepage</Link>
      </div>
    </section>
  );
}

function Home() {
  return (
    <>
      <Hero />
      <Strip />
        <section className="band tagline" aria-label="Tagline"><div className="wrap"><Tagline /></div></section>
        <Pack />
        <Playground />
        <Maker />
        <HowItWorks />
        <Figma />
      <Faq />
    </>
  );
}

export { Ending, Home, StickersPage, DocsPage, NotFound };
