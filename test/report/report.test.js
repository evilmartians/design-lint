import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseDirectives } from "../../src/report/directives.js";
import { buildReport, PLUGIN, renderReport } from "../../src/report/index.js";
import { rules } from "../../src/rules/index.js";

const REPO = fileURLToPath(new URL("../..", import.meta.url));
const CLI = join(REPO, "src", "cli.js");

const allOn = (namespace = "design") =>
  Object.fromEntries(Object.keys(rules).map((id) => [`${namespace}/${id}`, "error"]));

describe("parseDirectives", () => {
  it("reads both spellings, every kind, and both comment forms", () => {
    const text = [
      "/* eslint-disable design/no-raw-color */",
      "// oxlint-disable-next-line design/no-spectral-color, design/no-raw-color",
      'const a = "#f00"; // eslint-disable-line design/no-raw-color -- brand exception',
      "{/* oxlint-disable-next-line */}",
    ].join("\n");

    expect(parseDirectives(text)).toEqual([
      { kind: "disable", rules: ["design/no-raw-color"], line: 1 },
      { kind: "disable-next-line", rules: ["design/no-spectral-color", "design/no-raw-color"], line: 2 },
      { kind: "disable-line", rules: ["design/no-raw-color"], line: 3 },
      { kind: "disable-next-line", rules: [], line: 4 },
    ]);
  });

  it("ignores enable comments and look-alikes", () => {
    const text = [
      "/* eslint-enable design/no-raw-color */",
      "// eslint-disabled design/no-raw-color",
      "// see eslint-disable-next-line in the docs",
    ].join("\n");
    expect(parseDirectives(text)).toEqual([]);
  });

  it("reads a rule list that spans lines", () => {
    const text = "/* eslint-disable\n  design/no-raw-color,\n  design/no-dark-variant\n*/";
    expect(parseDirectives(text)[0].rules).toEqual(["design/no-raw-color", "design/no-dark-variant"]);
  });
});

describe("buildReport", () => {
  it("lists rules that are off and rules the config never turned on", () => {
    const configured = allOn();
    configured["design/no-opacity-modifier"] = "off";
    configured["design/no-dark-variant"] = ["off", { flagLightDark: false }];
    delete configured["design/no-component-color-override"];

    const report = buildReport({ config: { jsPlugins: [PLUGIN], rules: configured }, files: [] });
    expect(report.disabled).toEqual([
      { id: "no-component-color-override", reason: "not enabled" },
      { id: "no-dark-variant", reason: "off" },
      { id: "no-opacity-modifier", reason: "off" },
    ]);
  });

  it("counts comments naming design rules and bare ones, never other rules'", () => {
    const files = [
      {
        path: "a.tsx",
        text: [
          "/* eslint-disable design/no-raw-color */",
          "// eslint-disable-next-line react-hooks/exhaustive-deps",
          "// oxlint-disable-next-line design/no-raw-color, no-console",
        ].join("\n"),
      },
      { path: "b.tsx", text: "// eslint-disable-next-line\n// eslint-disable-line design/no-raw-colour" },
      { path: "c.tsx", text: "// eslint-disable-next-line no-console" },
    ];

    const { comments } = buildReport({ config: { rules: allOn() }, files });
    expect(comments).toEqual({
      byRule: [
        ["no-raw-color", 2],
        ["no-raw-colour", 1],
      ],
      bare: 1,
      total: 4,
    });
  });

  it("reads the namespace back from the configured rules", () => {
    const files = [{ path: "a.tsx", text: "// eslint-disable-next-line ds/no-raw-color, design/no-raw-color" }];
    const report = buildReport({ config: { rules: allOn("ds") }, files });
    expect(report.namespace).toBe("ds");
    expect(report.disabled).toEqual([]);
    expect(report.comments.byRule).toEqual([["no-raw-color", 1]]);
  });

  it("warns when the plugin is not loaded at all", () => {
    const text = renderReport(buildReport({ config: { rules: allOn() }, files: [] }));
    expect(text).toContain(`${PLUGIN} is not in jsPlugins`);
  });
});

describe("renderReport", () => {
  it("prints every section", () => {
    const configured = { ...allOn(), "design/no-opacity-modifier": "off" };
    const report = buildReport({
      config: { jsPlugins: [PLUGIN], rules: configured, ignorePatterns: ["src/legacy/**"] },
      files: [{ path: "a.tsx", text: "// eslint-disable-next-line design/no-raw-color\n// eslint-disable-line" }],
    });

    expect(renderReport(report, { configPath: "oxlint.config.ts" })).toBe(
      [
        "design-lint report — oxlint.config.ts",
        "",
        "Disabled rules (1 of 9)",
        "  no-opacity-modifier  off",
        "",
        "Disable comments (2)",
        "  no-raw-color             1",
        "  (all rules, none named)  1",
        "",
        "Ignored paths (ignorePatterns)",
        "  src/legacy/**",
        "",
      ].join("\n"),
    );
  });
});

describe("design-lint report", () => {
  // A throwaway project in the OS temp directory, so this repository's own files never answer
  // for it. Its config is a plain object: the CLI reads whatever the config exports, and
  // resolving a design system would only slow the test down. Oxlint still loads the config
  // to list files, and refuses rules from a plugin it has not loaded, so a stub stands in for
  // the real one. Only oxlint is linked in, and `.gitignore` keeps it out of the lint, as it
  // keeps `node_modules` out of a real project.
  const config = (rules) =>
    `export default ${JSON.stringify({
      jsPlugins: ["./stub-plugin.mjs"],
      categories: { correctness: "off" },
      rules,
      ignorePatterns: ["src/legacy/**"],
    })};`;

  const project = () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "design-lint-report-")));
    mkdirSync(join(root, "node_modules"));
    symlinkSync(join(REPO, "node_modules", "oxlint"), join(root, "node_modules", "oxlint"));
    writeFileSync(join(root, ".gitignore"), "node_modules\n");
    writeFileSync(
      join(root, "stub-plugin.mjs"),
      `const rule = { create: () => ({}) };
export default { meta: { name: "design" }, rules: Object.fromEntries(${JSON.stringify(Object.keys(rules))}.map((id) => [id, rule])) };`,
    );
    mkdirSync(join(root, "src", "legacy"), { recursive: true });
    writeFileSync(join(root, "oxlint.config.ts"), config({ ...allOn(), "design/no-dark-variant": "off" }));
    writeFileSync(join(root, "src", "a.tsx"), "// eslint-disable-next-line design/no-raw-color\nexport {};\n");
    writeFileSync(join(root, "src", "legacy", "b.tsx"), "/* eslint-disable design/no-raw-color */\nexport {};\n");
    return root;
  };

  const run = (cwd, ...args) =>
    execFileSync(process.execPath, [CLI, "report", ...args], { cwd, encoding: "utf-8" });

  it("reads the config and counts comments only in files oxlint lints", () => {
    const output = run(project());
    expect(output).toContain("design-lint report — oxlint.config.ts");
    expect(output).toContain("Disabled rules (1 of 9)\n  no-dark-variant  off");
    expect(output).toContain("Disable comments (1)\n  no-raw-color  1");
    expect(output).toContain("Ignored paths (ignorePatterns)\n  src/legacy/**");
  });

  it("takes an explicit config", () => {
    const root = project();
    writeFileSync(join(root, "other.config.ts"), config(allOn()));
    expect(run(root, "--config", "other.config.ts")).toContain("Disabled rules (0 of 9)\n  none");
  });

  it("says where it looked when there is no config", () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "design-lint-report-")));
    expect(() => execFileSync(process.execPath, [CLI, "report"], { cwd: root, stdio: "pipe" })).toThrow(
      /no oxlint\.config\.ts in/,
    );
  });
});
