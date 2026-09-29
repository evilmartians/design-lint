/**
 * Loading a design system, which is the one thing in `/policy` that touches a filesystem.
 *
 * It is isolated here for the reason the whole package is shaped the way it is: a rule
 * must never read a file, resolve a path, or derive anything from its own location. The
 * consumer supplies `tokenFiles`; the factory loads them **once** and hands rules the
 * resolved result. That is the one deliberate exception, and this is where it happens.
 *
 * **The loading itself is Tailwind's.** `@tailwindcss/node` is the integration that
 * `@tailwindcss/vite`, `@tailwindcss/postcss` and the CLI are built on, and its loader
 * resolves `@import` and `@plugin` exactly as the build does — through the `style` export
 * condition, `NODE_PATH`, `jiti` for a TypeScript plugin. A resolver of our own would be
 * wrong in the way every re-derived resolver eventually is — `@import "tw-animate-css"`
 * fails, because that package does not export its own manifest. A linter that resolves stylesheets differently from the build will
 * disagree with it about what a class means, so this file finds the engine and does
 * nothing else.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";

const ENGINE = "@tailwindcss/node";

/** The first Tailwind whose design system has every method `./design-system.js` calls. */
const MIN_TAILWIND = "4.1.18";

/**
 * Packages that carry the engine as their own dependency. Under a strict pnpm layout the
 * engine is never hoisted — it sits in `node_modules/.pnpm`, reachable only from the build
 * tool that depends on it — so a project using `@tailwindcss/vite` has an engine that a
 * lookup from the project root cannot see. Resolving from the build tool's real directory
 * finds the copy the build actually runs.
 */
const BUILD_TOOLS = ["@tailwindcss/vite", "@tailwindcss/postcss", "@tailwindcss/cli", "@tailwindcss/webpack"];

/**
 * Build a Tailwind design system from a stylesheet.
 *
 * @param {string} entryCss The stylesheet's contents — not its path. A caller that has a
 *   path writes an `@import` of it; a caller that has the text (a test, the corpus) is not
 *   forced to invent a file for it. A policy that can only be handed a filename cannot be
 *   varied per case, and a contract that cannot vary it cannot express the cases that
 *   matter.
 * @param {{ base?: string }} [options] Directory the project, and so the engine and every
 *   bare `@import`, is resolved from.
 * @returns {Promise<object>} The resolved design system.
 */
export async function loadDesignSystem(entryCss, { base = process.cwd() } = {}) {
  const engine = resolveTailwindEngine(base);
  const module = await import(pathToFileURL(engine.entry).href);
  const load = module.__unstable__loadDesignSystem ?? module.default?.__unstable__loadDesignSystem;
  if (typeof load !== "function") {
    throw new Error(
      `design-lint: ${ENGINE} ${engine.version} at ${engine.entry} does not provide __unstable__loadDesignSystem. It is an unstable API; this package is tested against 4.x.`,
    );
  }
  const designSystem = await load(entryCss, { base });
  // An engine that loads is not yet one that works: `candidatesToAst` arrived in 4.1.18, and
  // below that every rule throws the same TypeError on every file. Refuse once, here.
  if (typeof designSystem?.candidatesToAst !== "function") {
    throw new Error(
      `design-lint: ${ENGINE} ${engine.version ?? "(unknown version)"} at ${engine.entry} is too old; design-lint needs Tailwind ${MIN_TAILWIND} or later. It runs the engine your build runs, so upgrade tailwindcss and ${ENGINE} in the project.`,
    );
  }
  return designSystem;
}

/**
 * Tailwind's own stock palette, as a design system: what a bare `@import "tailwindcss"`
 * defines. Subtracted from a project's namespace it leaves the project's own tokens — see
 * `projectTokens` in `./tokens.js`. Built from `base` by the same engine as the project's,
 * so the two agree about which names are stock.
 *
 * @param {{ base?: string }} [options]
 * @returns {Promise<object>}
 */
export function loadPalette({ base = process.cwd() } = {}) {
  return loadDesignSystem('@import "tailwindcss";', { base });
}

/**
 * The Tailwind engine the project's own build runs.
 *
 * Found from the project, never from this package: a linter running a different Tailwind
 * from the build is a linter that can disagree with it about which classes exist. Looked up
 * from `base` first, then through each build tool present; where several copies turn up —
 * pnpm installs a peer at the root *and* keeps the build tool's own — the one matching the
 * project's `tailwindcss` wins.
 *
 * @param {string} [base]
 * @returns {{ entry: string, version: string | null, projectVersion: string | null }}
 */
export function resolveTailwindEngine(base = process.cwd()) {
  const projectVersion = versionOf(packageDirectory("tailwindcss", base));

  const found = [];
  for (const dir of [base, ...buildToolDirectories(base)]) {
    const resolved = tryResolve(ENGINE, dir);
    if (!resolved) continue;
    const entry = realpathSync(resolved);
    if (found.some((engine) => engine.entry === entry)) continue;
    found.push({ entry, version: versionOf(owningPackage(entry)) });
  }

  if (found.length === 0) {
    throw new Error(
      `design-lint: cannot find ${ENGINE}, the Tailwind engine your build runs, from ${base}. It ships with @tailwindcss/vite and @tailwindcss/postcss; with neither installed, add it: npm install --save-dev ${ENGINE}`,
    );
  }

  const engine = found.find((candidate) => candidate.version === projectVersion) ?? found[0];
  if (engine.version && !engine.version.startsWith("4.")) {
    throw new Error(
      `design-lint: found ${ENGINE} ${engine.version}, but this package is built against Tailwind 4. The design-system API it uses is unstable across majors.`,
    );
  }
  return { ...engine, projectVersion };
}

/**
 * Read the stylesheets named by `tokenFiles` and concatenate them into one entry.
 *
 * @param {string[]} tokenFiles
 * @param {{ base?: string }} [options]
 * @returns {string}
 */
export function readTokenFiles(tokenFiles, { base = process.cwd() } = {}) {
  return tokenFiles
    .map((file) => readFileSync(isAbsolute(file) ? file : join(base, file), "utf-8"))
    .join("\n");
}

function tryResolve(name, dir) {
  try {
    return createRequire(join(dir, "noop.js")).resolve(name);
  } catch {
    return null;
  }
}

function buildToolDirectories(base) {
  return BUILD_TOOLS.map((tool) => packageDirectory(tool, base))
    .filter(Boolean)
    .map((dir) => realpathSync(dir));
}

/**
 * The first `node_modules/<name>` above `start`. A plain filesystem walk rather than
 * `require.resolve("<name>/package.json")`, because a package with an export map need not
 * export its manifest — `@tailwindcss/node` itself does not.
 */
function packageDirectory(name, start) {
  for (let dir = start; ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) return candidate;
    if (dirname(dir) === dir) return null;
  }
}

/** The package a resolved file belongs to: the nearest directory above it with a manifest. */
function owningPackage(file) {
  for (let dir = dirname(file); ; dir = dirname(dir)) {
    if (existsSync(join(dir, "package.json"))) return dir;
    if (dirname(dir) === dir) return null;
  }
}

function versionOf(dir) {
  if (!dir) return null;
  try {
    return JSON.parse(readFileSync(join(dir, "package.json"), "utf-8")).version ?? null;
  } catch {
    return null;
  }
}
