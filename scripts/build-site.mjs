// Builds the folder that Firebase Hosting publishes ("dist"): only the files the website needs.
// The repository root also holds private and development files (.env, supabase/, docs/, ...), which
// must never be published, so nothing is published from the root. Run:  node scripts/build-site.mjs
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");

// The only things that go on the website.
const SITE = [
  "index.html", "exec.html", "calendar.html", "view.html", "privacy.html", "terms.html",
  "manifest.json", "sw.js", "assets",
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const name of SITE) {
  const from = join(root, name);
  if (!existsSync(from)) throw new Error(`Missing site file: ${name}`);
  cpSync(from, join(out, name), { recursive: true });
}

function sizeOf(dir) {
  let bytes = 0;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    bytes += statSync(p).isDirectory() ? sizeOf(p) : statSync(p).size;
  }
  return bytes;
}
console.log(`dist ready: ${(sizeOf(out) / 1e6).toFixed(2)} MB`);
