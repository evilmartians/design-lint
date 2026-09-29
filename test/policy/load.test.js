import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadDesignSystem, resolveTailwindEngine } from "../../src/policy/load.js";
import { designLint } from "../../src/preset/index.js";
import { consume } from "../../src/preset/resolved.js";

/**
 * Finding the engine, which is where a linter and a build can quietly come to disagree.
 *
 * These build throwaway project layouts in the OS temp directory — never inside this
 * repository, whose own `node_modules` would otherwise answer every lookup and make each
 * test pass for the wrong reason.
 */

const REPO = fileURLToPath(new URL("../..", import.meta.url));
const REAL_ENGINE = realpathSync(createRequire(join(REPO, "noop.js")).resolve("@tailwindcss/node"));
const REAL_ENGINE_DIR = join(REPO, "node_modules", "@tailwindcss", "node");

const project = () => realpathSync(mkdtempSync(join(tmpdir(), "design-lint-")));

describe("resolveTailwindEngine", () => {
  it("finds the engine installed in the project", () => {
    const engine = resolveTailwindEngine(REPO);
    expect(engine.entry).toBe(REAL_ENGINE);
    expect(engine.version).toMatch(/^4\./);
  });

  it("finds the engine behind a build tool under a strict pnpm layout", () => {
    // pnpm keeps `@tailwindcss/node` in `.pnpm/`, next to `@tailwindcss/vite`, and never at
    // the project root: a lookup from the root fails, and only the build tool can see it.
    const root = project();
    const store = join(root, "node_modules", ".pnpm", "@tailwindcss+vite@4", "node_modules", "@tailwindcss");
    mkdirSync(join(store, "vite"), { recursive: true });
    writeFileSync(join(store, "vite", "package.json"), '{ "name": "@tailwindcss/vite", "version": "4.0.0" }');
    symlinkSync(REAL_ENGINE_DIR, join(store, "node"));
    mkdirSync(join(root, "node_modules", "@tailwindcss"), { recursive: true });
    symlinkSync(join(store, "vite"), join(root, "node_modules", "@tailwindcss", "vite"));

    expect(() => createRequire(join(root, "noop.js")).resolve("@tailwindcss/node")).toThrow();
    expect(resolveTailwindEngine(root).entry).toBe(REAL_ENGINE);
  });

  it("refuses to start on an engine older than the design-system API it needs", async () => {
    // `candidatesToAst` arrived in Tailwind 4.1.18. Without this check an older engine loads
    // fine and every rule then throws the same TypeError on every file it lints.
    const root = project();
    const engine = join(root, "node_modules", "@tailwindcss", "node");
    mkdirSync(engine, { recursive: true });
    writeFileSync(
      join(engine, "package.json"),
      '{ "name": "@tailwindcss/node", "version": "4.1.17", "type": "module", "main": "index.js" }',
    );
    writeFileSync(join(engine, "index.js"), "export const __unstable__loadDesignSystem = async () => ({});\n");

    await expect(loadDesignSystem('@import "tailwindcss";', { base: root })).rejects.toThrow(
      /@tailwindcss\/node 4\.1\.17 .*4\.1\.18 or later/,
    );
  });

  it("refuses to guess when there is no engine at all", () => {
    expect(() => resolveTailwindEngine(project())).toThrow(/cannot find @tailwindcss\/node/);
  });
});

describe("designLint", () => {
  it("resolves a token file's own relative imports from where the file sits", async () => {
    // Pasted into one entry string, `@import "./tokens.css"` would resolve from the working
    // directory and the lint run would die; imported by path, it resolves like the build.
    const root = project();
    symlinkSync(join(REPO, "node_modules"), join(root, "node_modules"));
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "styles.css"), '@import "tailwindcss";\n@import "./tokens.css";\n');
    writeFileSync(join(root, "src", "tokens.css"), "@theme { --color-brand: oklch(0.6 0.2 25); }\n");

    await designLint({ tokenFiles: ["src/styles.css"], componentSources: [], base: root });
    expect(consume().designSystem.resolves("bg-brand")).toBe(true);
    // And it is the project's own: a scan of the token file's text would miss a token
    // defined in a file it imports, and report it as palette.
    expect(consume().tokens).toEqual(new Set(["brand"]));
  });

  it("refuses to start when the token stylesheets define no colour at all", async () => {
    // Every rule that reads class strings is gated on which utilities take a colour, and a
    // theme with no colours answers "none" — so the linter would run, report nothing, and
    // look like a clean codebase.
    const root = project();
    symlinkSync(join(REPO, "node_modules"), join(root, "node_modules"));
    writeFileSync(join(root, "styles.css"), '@import "tailwindcss";\n@theme { --color-*: initial; }\n');

    await expect(
      designLint({ tokenFiles: ["styles.css"], componentSources: [], base: root }),
    ).rejects.toThrow(/define no --color-\* tokens/);
  });
});
