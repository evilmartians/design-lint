import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { designLint } from "../../src/preset/index.js";
import { rules } from "../../src/rules/index.js";

/**
 * Which rules each preset turns on, and the options that choose it.
 *
 * The lists are spelled out here rather than read back from the factory: a rule moving
 * between presets is a breaking release, so it should take a deliberate edit to this file.
 */

const base = fileURLToPath(new URL("../..", import.meta.url));
const tokenFiles = ["test/fixtures/theme.css"];

const BASIC = [
  "no-arbitrary-radius",
  "no-arbitrary-typography",
  "no-raw-color",
  "no-spectral-color",
  "no-style-color",
  "no-undefined-token",
  "no-useless-hover",
];
const STRICT_ONLY = [
  "no-component-color-override",
  "no-dark-variant",
  "no-opacity-modifier",
  "token-constraints",
];

const ruleIds = (config) => Object.keys(config.rules).map((id) => id.replace("design/", "")).sort();

describe("presets", () => {
  it("basic turns on the rules that need nothing beyond the token stylesheets", async () => {
    expect(ruleIds(await designLint({ preset: "basic", tokenFiles, base }))).toEqual(BASIC);
  });

  it("strict turns on every basic rule and the rules that assume a project layout", async () => {
    const config = await designLint({ preset: "strict", tokenFiles, componentSources: ["@/ui/*"], base });
    expect(ruleIds(config)).toEqual([...BASIC, ...STRICT_ONLY].sort());
    expect(config.rules["design/no-component-color-override"]).toEqual(["error", { componentSources: ["@/ui/*"] }]);
  });

  it("between them cover every rule the plugin ships", () => {
    expect([...BASIC, ...STRICT_ONLY].sort()).toEqual(Object.keys(rules).sort());
  });

  it("strict with no component library leaves out no-component-color-override", async () => {
    const config = await designLint({ preset: "strict", tokenFiles, componentSources: [], base });
    expect(ruleIds(config)).not.toContain("no-component-color-override");
  });

  it("defaults to strict", async () => {
    const config = await designLint({ tokenFiles, componentSources: ["@/ui/*"], base });
    expect(ruleIds(config)).toEqual([...BASIC, ...STRICT_ONLY].sort());
  });

  it("refuses a preset it does not know", async () => {
    await expect(designLint({ preset: "recommended", tokenFiles, base })).rejects.toThrow(
      /unknown `preset` "recommended"/,
    );
  });

  it("refuses componentSources under basic, where nothing reads it", async () => {
    await expect(designLint({ preset: "basic", tokenFiles, componentSources: [], base })).rejects.toThrow(
      /does not turn on/,
    );
  });

  it("requires componentSources under strict", async () => {
    await expect(designLint({ preset: "strict", tokenFiles, base })).rejects.toThrow(
      /required by the "strict" preset/,
    );
  });
});
