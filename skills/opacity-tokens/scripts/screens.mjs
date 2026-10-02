// Render every Storybook story that touches a changed file, before and after, and diff them.
//
// usage: node screens.mjs --work <dir> --before <static storybook> --after <static storybook>
//                         --repo <worktree> --tools <dir with playwright, pngjs, pixelmatch, sharp>
//
// Both builds are served from this process. Each story is shot at 1200px, animations off, and
// compared pixel by pixel (threshold 0.02). A story that differs is shot again on `before` to
// prove the render is deterministic, then re-shot at 2x and cropped around the changed pixels
// for the report. A story that renders on `before` but shows Storybook's error screen on `after`
// is a regression: it is kept, flagged, and shot like a changed story. One already failing on
// `before` cannot be judged and is set aside as broken.
// Writes <work>/shots.json and <work>/img/*.webp.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, a) => (v.startsWith("--") ? [...acc, [v.slice(2), a[i + 1]]] : acc), []));
for (const k of ["work", "before", "after", "repo", "tools"]) if (!args[k]) throw new Error(`missing --${k}`);
const need = createRequire(path.join(path.resolve(args.tools), "package.json"));
const { chromium } = need("playwright");
const { PNG } = need("pngjs");
const pixelmatchMod = need("pixelmatch");
const pixelmatch = pixelmatchMod.default ?? pixelmatchMod;
const sharp = need("sharp");

const W = path.resolve(args.work), IMG = path.join(W, "img");
fs.mkdirSync(IMG, { recursive: true });
const THRESHOLD = 0.02, VIEW = { width: 1200, height: 800 }, STORIES_PER_FILE = 3;

// ── Which stories cover the changed files ────────────────────────────────────────────────
const applied = JSON.parse(fs.readFileSync(path.join(W, "applied.json"), "utf8"));
const changed = new Map();
for (const h of applied) {
  const c = changed.get(h.file) ?? { n: 0, moved: 0 };
  c.n++; if (h.step != null && h.step !== h.v) c.moved++;
  changed.set(h.file, c);
}
const index = JSON.parse(fs.readFileSync(path.join(args.before, "index.json"), "utf8")).entries;
const byStoryFile = new Map();
for (const e of Object.values(index)) {
  if (e.type !== "story") continue;
  const p = e.importPath.replace(/^\.\//, "");
  if (!byStoryFile.has(p)) byStoryFile.set(p, e);
}
const storySrc = new Map();
const read = (p) => { if (!storySrc.has(p)) { try { storySrc.set(p, fs.readFileSync(path.join(args.repo, p), "utf8")); } catch { storySrc.set(p, ""); } } return storySrc.get(p); };
const stories = new Map();
for (const [file, info] of changed) {
  const stem = file.replace(/\.[cm]?[jt]sx?$/, ""), mod = path.basename(stem);
  let cand = [...byStoryFile.keys()].filter((p) => p.startsWith(stem + ".stories."));
  if (!cand.length) {
    // A story elsewhere that imports this module by name.
    const re = new RegExp(`from ['"][^'"]*/${mod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`);
    cand = [...byStoryFile.keys()].filter((p) => re.test(read(p)));
  }
  // A module without its own story can render inside several; cover a few, picked the same way
  // every run (shortest path, then alphabetical), so the story set does not drift between runs.
  for (const p of cand.sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, STORIES_PER_FILE)) {
    const e = byStoryFile.get(p);
    const s = stories.get(e.id) ?? { story: e.id, title: `${e.title} / ${e.name}`, files: [], moved: 0 };
    s.files.push(file); s.moved += info.moved;
    stories.set(e.id, s);
  }
}
console.log(`${changed.size} changed files, ${stories.size} stories cover them`);

// ── Serve both builds ────────────────────────────────────────────────────────────────────
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".webp": "image/webp", ".jpg": "image/jpeg" };
const serve = (root) => new Promise((ok) => {
  const srv = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    fs.readFile(fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, "index.html") : p, (err, buf) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": TYPES[path.extname(p)] ?? "application/octet-stream" }); res.end(buf);
    });
  }).listen(0, () => ok({ srv, port: srv.address().port }));
});
const [B, A] = [await serve(path.resolve(args.before)), await serve(path.resolve(args.after))];

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx1 = await browser.newContext({ viewport: VIEW, reducedMotion: "reduce", deviceScaleFactor: 1 });
const ctx2 = await browser.newContext({ viewport: VIEW, reducedMotion: "reduce", deviceScaleFactor: 2 });
// A fixed wait races the page under load: late content lands after the shot on one side and
// before it on the other. So a shot is taken only once the page stops changing: two consecutive
// screenshots, SETTLE ms apart, must be byte-identical (up to MAX_TRIES).
const SETTLE = 500, MAX_TRIES = 10;
async function shoot(ctx, port, id) {
  const page = await ctx.newPage();
  try {
    await page.goto(`http://localhost:${port}/iframe.html?id=${id}&viewMode=story`, { waitUntil: "networkidle", timeout: 30000 });
    await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
    await page.evaluate(() => document.fonts.ready);
    let prev = null, png = null, settled = false;
    for (let i = 0; i < MAX_TRIES && !settled; i++) {
      await page.waitForTimeout(SETTLE);
      png = await page.screenshot({ fullPage: true });
      settled = prev !== null && png.equals(prev);
      prev = png;
    }
    const broken = await page.evaluate(() => document.body.classList.contains("sb-show-errordisplay"));
    return { png, broken, settled };
  } catch (e) {
    // The page never loaded (a timeout under load, a crashed tab). That says nothing about the
    // story itself, so it is not `broken`: only Storybook's own error screen is.
    return { png: null, broken: false, failed: true, error: String(e).slice(0, 160) };
  } finally { await page.close(); }
}
// A load failure is usually the machine, not the story: try once more before giving up on it.
async function shootTwice(ctx, port, id) {
  const first = await shoot(ctx, port, id);
  return first.failed ? shoot(ctx, port, id) : first;
}
function compare(a, b) {
  const A1 = PNG.sync.read(a), B1 = PNG.sync.read(b);
  if (A1.width !== B1.width || A1.height !== B1.height) return { pixels: -1, A1, B1 };
  const D = new PNG({ width: A1.width, height: A1.height });
  const pixels = pixelmatch(A1.data, B1.data, D.data, A1.width, A1.height, { threshold: THRESHOLD, diffMask: true });
  return { pixels, D, A1 };
}
function bbox(D) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < D.height; y++) for (let x = 0; x < D.width; x++) {
    if (D.data[(y * D.width + x) * 4 + 3] === 0) continue; // diffMask leaves unchanged pixels transparent
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

const results = [];
const queue = [...stories.values()];
let done = 0;
async function worker() {
  while (queue.length) {
    const s = queue.shift();
    const [b, a] = [await shootTwice(ctx1, B.port, s.story), await shootTwice(ctx1, A.port, s.story)];
    // broken: the error screen already shows on `before`, so there is nothing to judge.
    // regression: `before` renders and `after` shows the error screen — a screenshot exists on
    // both sides, so it is diffed and cropped like any change. failed: either side would not
    // load even on a retry; that is the machine, not the change, and claims nothing either way.
    const r = { ...s, diff: 0, broken: b.broken, regression: !b.failed && !b.broken && a.broken };
    if (b.failed || a.failed) Object.assign(r, { diff: null, failed: true, error: (b.error ?? a.error) });
    else if (!r.broken) {
      const c = compare(b.png, a.png);
      if (c.pixels !== 0 && !r.regression) {
        // Prove the difference is the change: a page that never settled, or a fresh "before" that
        // differs from the first, renders differently on its own and its diff would be noise.
        const again = await shoot(ctx1, B.port, s.story);
        r.flaky = !b.settled || !a.settled || !again.png || compare(b.png, again.png).pixels !== 0;
      }
      r.diff = c.pixels;
      // -1: the page changed size, still a change worth showing. A regression is always shown.
      if ((c.pixels !== 0 || r.regression) && !r.flaky) {
        // Same size: frame the changed pixels. Size changed (layout moved): show the top of the page.
        const bb = c.D && !r.regression ? bbox(c.D) : { x0: 0, y0: 0, x1: c.A1.width - 1, y1: 600 };
        const pad = 48, H = Math.min(c.A1.height, PNG.sync.read(a.png).height), Wd = c.A1.width;
        let left = Math.max(0, bb.x0 - pad), top = Math.max(0, bb.y0 - pad);
        let width = bb.x1 - bb.x0 + 1 + 2 * pad, height = Math.min(bb.y1 - bb.y0 + 1 + 2 * pad, 700);
        if (width < 520) { left = Math.max(0, left - Math.floor((520 - width) / 2)); width = 520; }
        width = Math.min(width, Wd - left); height = Math.min(height, H - top);
        const [b2, a2] = [await shootTwice(ctx2, B.port, s.story), await shootTwice(ctx2, A.port, s.story)];
        if (!b2.png || !a2.png) { // the 2x pass would not load: no images, so the report cannot show it
          Object.assign(r, { failed: true, error: b2.error ?? a2.error });
          results.push(r);
          if (++done % 20 === 0) console.log(`${done}/${stories.size}`);
          continue;
        }
        r.crop = { left, top, width, height };
        const crop2 = { left: left * 2, top: top * 2, width: width * 2, height: height * 2 };
        const raw = [];
        for (const [k, png] of [["before", b2.png], ["after", a2.png]]) {
          const m = await sharp(png).metadata();
          const c2 = { ...crop2, width: Math.min(crop2.width, m.width - crop2.left), height: Math.min(crop2.height, m.height - crop2.top) };
          await sharp(png).extract(c2).webp({ quality: 80 }).toFile(path.join(IMG, `${s.story}.${k}.webp`));
          raw.push(await sharp(png).extract(c2).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
        }
        const [rb, ra] = raw;
        if (rb.info.width === ra.info.width && rb.info.height === ra.info.height) {
          const out = Buffer.alloc(rb.info.width * rb.info.height * 4);
          pixelmatch(rb.data, ra.data, out, rb.info.width, rb.info.height, { threshold: THRESHOLD });
          await sharp(out, { raw: { width: rb.info.width, height: rb.info.height, channels: 4 } }).webp({ quality: 80 }).toFile(path.join(IMG, `${s.story}.diff.webp`));
        }
      } else if (c.pixels === 0 && !r.regression) {
        const m = await sharp(a.png).metadata();
        await sharp(a.png).resize({ width: 480 }).extract({ left: 0, top: 0, width: 480, height: Math.min(320, Math.floor((m.height * 480) / m.width)) })
          .webp({ quality: 70 }).toFile(path.join(IMG, `${s.story}.thumb.webp`));
      }
    }
    results.push(r);
    if (++done % 20 === 0) console.log(`${done}/${stories.size}`);
  }
}
await Promise.all(Array.from({ length: 3 }, worker)); // more browsers starve each other and slow settling
await browser.close(); B.srv.close(); A.srv.close();
fs.writeFileSync(path.join(W, "shots.json"), JSON.stringify(results, null, 1));
const n = (f) => results.filter(f).length;
console.log(`stories: ${results.length} · changed ${n((r) => r.diff && !r.flaky && !r.regression && !r.failed)} · same ${n((r) => r.diff === 0 && !r.broken)} · REGRESSIONS ${n((r) => r.regression)} · broken on before ${n((r) => r.broken)} · flaky ${n((r) => r.flaky)} · failed to load ${n((r) => r.failed)} · size-changed ${n((r) => r.diff === -1)}`);
