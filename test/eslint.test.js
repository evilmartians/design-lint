import { fileURLToPath } from "node:url";

import { Linter } from "eslint";
import { describe, expect, it } from "vitest";

import { designLint } from "../src/preset/index.js";

/**
 * The plugin, run through ESLint.
 *
 * The contracts run through Oxlint, which hands a rule a context it has not frozen. ESLint
 * freezes it, and a rule bound to resolved inputs threw on load there while every contract
 * passed. So the README's ESLint setup is exercised here as written: the factory first, then
 * the plugin, then a file with one class each bound rule would report.
 */

const design = await designLint({
  tokenFiles: ["test/fixtures/theme.css"],
  componentSources: ["@/ui/*"],
  base: fileURLToPath(new URL("..", import.meta.url)),
});
const plugin = (await import("../src/oxlint.js")).default;

const lint = (code) =>
  new Linter().verify(
    code,
    [
      {
        files: ["**/*.jsx"],
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { design: plugin },
        rules: design.rules,
      },
    ],
    "App.jsx",
  );

describe("the plugin under ESLint", () => {
  it("loads every rule", () => {
    expect(lint('<div className="bg-primary" />;')).toEqual([]);
  });

  it("reports through the rules bound to the design system", () => {
    const code = `import { Card } from "@/ui/card";
<><div className="bg-red-500" /><Card className="bg-primary" /></>;`;
    expect(lint(code).map((m) => m.ruleId).sort()).toEqual([
      "design/no-component-color-override",
      "design/no-spectral-color",
    ]);
  });
});
