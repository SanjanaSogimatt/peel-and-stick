// Pulls sticker designs from YOUR Figma file into /stickers, then regenerates src/art.
//
// Setup (once):
//   1. In Figma (your personal account): Settings -> Security -> Personal access tokens
//      -> Generate new token with "File content: Read-only".
//   2. Create a .env file in the package root (it's git-ignored):
//        FIGMA_TOKEN=figd_xxx
//        FIGMA_FILE=https://www.figma.com/design/AbC123/My-Stickers
//   3. In that Figma file, name each sticker frame/component  sticker/<name>
//      e.g. "sticker/star", "sticker/coffee". Give it a transparent background so
//      the die-cut outline comes through.
//
// Run:  npm run figma:sync
// Options:
//   --page "Stickers"   only look on this page
//   --prefix "sticker/" naming prefix to look for (default "sticker/")
//   --dry               list what would be synced, write nothing
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "stickers");
const API = process.env.FIGMA_API || "https://api.figma.com";

// --- tiny .env loader (no dependency) ---
const envFile = join(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const PAGE = opt("--page");
const PREFIX = (opt("--prefix", "sticker/") || "").toLowerCase();
const DRY = args.includes("--dry");

const token = process.env.FIGMA_TOKEN;
const fileInput = process.env.FIGMA_FILE || process.env.FIGMA_FILE_KEY || "";
const fileKey = (fileInput.match(/figma\.com\/(?:design|file|board)\/([A-Za-z0-9]+)/) || [])[1] || fileInput;
if (!token || !fileKey) {
  console.error("Missing FIGMA_TOKEN or FIGMA_FILE. See the comment at the top of scripts/figma-sync.mjs.");
  process.exit(1);
}

async function figma(path) {
  const res = await fetch(API + path, { headers: { "X-Figma-Token": token } });
  if (!res.ok) throw new Error(`Figma API ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "sticker";
const EXPORTABLE = new Set(["FRAME", "COMPONENT", "INSTANCE", "GROUP"]);

function collect(node, found) {
  const name = (node.name || "").trim();
  if (EXPORTABLE.has(node.type) && name.toLowerCase().startsWith(PREFIX) && name.length > PREFIX.length) {
    found.push({ id: node.id, name: name.slice(PREFIX.length) });
    return; // don't look inside a sticker
  }
  for (const child of node.children || []) collect(child, found);
}

const file = await figma(`/v1/files/${fileKey}`);
const pages = (file.document.children || []).filter((p) => !PAGE || p.name === PAGE);
if (PAGE && !pages.length) throw new Error(`No page named "${PAGE}" in "${file.name}"`);

const found = [];
pages.forEach((p) => collect(p, found));
if (!found.length) {
  console.log(`No frames named "${PREFIX}<name>" found in "${file.name}". Rename your sticker frames and try again.`);
  process.exit(0);
}
console.log(`Found ${found.length} sticker(s) in "${file.name}": ${found.map((f) => f.name).join(", ")}`);
if (DRY) process.exit(0);

mkdirSync(outDir, { recursive: true });
const seen = new Set();
for (let i = 0; i < found.length; i += 40) {
  const batch = found.slice(i, i + 40);
  const ids = batch.map((f) => f.id).join(",");
  const { images, err } = await figma(
    `/v1/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=svg&svg_outline_text=true&svg_include_id=false&svg_simplify_stroke=true`
  );
  if (err) throw new Error(`Figma export error: ${err}`);
  for (const f of batch) {
    const url = images[f.id];
    if (!url) { console.warn(`  skipped ${f.name} (Figma returned no image)`); continue; }
    const svg = await (await fetch(url)).text();
    let base = slug(f.name);
    while (seen.has(base)) base += "-2";
    seen.add(base);
    writeFileSync(join(outDir, `${base}.svg`), svg);
    console.log(`  ✓ stickers/${base}.svg`);
  }
}

execFileSync(process.execPath, [join(root, "scripts", "build-art.mjs")], { stdio: "inherit" });
console.log("Done. Import them with:  import { Sticker, <name> } from \"peel-and-stick\"");
