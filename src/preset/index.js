import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { designSystemPolicy } from "../policy/design-system.js";
import { loadDesignSystem, loadPalette } from "../policy/load.js";
import { projectTokens } from "../policy/tokens.js";
import { publish } from "./resolved.js";

/**
 * Each preset selects rules to enable at the consumer's `severity`. Rule defaults live
 * in `meta.defaultOptions`, or in `create` for token-constraints, so changing severity
 * without options still uses the recommended policy.
 *
 * `basic` requires only token stylesheets. `strict` includes basic rules and checks for
 * token roles, themes, translucent tokens, and component variants.
 * Choose a rule's preset by its requirements. `strict` is the default.
 *
 * New rules ship disabled. Adding a rule to a preset or moving one from `strict` to
 * `basic` requires a breaking release: a major, or a minor before 1.0.
 * See the versioning policy in CHANGELOG.md.
 */
const BASIC = [
  "no-arbitrary-radius",
  "no-arbitrary-typography",
  "no-raw-color",
  "no-spectral-color",
  "no-style-color",
  "no-undefined-token",
  "no-useless-hover",
];

const PRESETS = {
  basic: BASIC,
  strict: [
    ...BASIC,
    "no-component-color-override",
    "no-dark-variant",
    "no-opacity-modifier",
    "token-constraints",
  ],
};

/**
 * The factory a consumer imports.
 *
 * ```ts
 * // oxlint.config.ts
 * import { defineConfig } from "oxlint";
 * import { designLint } from "@evilmartians/design-lint/preset";
 *
 * export default defineConfig(
 *   await designLint({
 *     tokenFiles: ["src/styles.css"],
 *     componentSources: ["@/components/ui/*"], // as your imports spell it
 *   }),
 * );
 * ```
 *
 * Two measured facts about Oxlint give this its shape, and neither is worked around:
 *
 * - **`jsPlugins` takes a specifier, never a plugin object.** Handing it a constructed
 *   plugin fails to parse, so this factory names the plugin rather than building it.
 * - **The config file and the plugin module share one process and one module registry**,
 *   with the config evaluated first. So the design system is resolved here, where the
 *   consumer's own paths sit relative to their own working directory, and handed over
 *   through `./resolved.js`. That is what lets the plugin read no config of its own, find
 *   nothing up the tree, and derive no path from where it was installed.
 *
 * It is `async` because building a Tailwind design system is. A consumer writes `await`,
 * and the one filesystem read this package performs happens here, once per lint run.
 */
export async function designLint({
  preset = "strict",
  tokenFiles,
  componentSources,
  namespace = "design",
  severity = "error",
  base = process.cwd(),
} = {}) {
  if (!Object.hasOwn(PRESETS, preset)) {
    throw new Error(
      `design-lint: unknown \`preset\` ${JSON.stringify(preset)}. Use "basic" for checks that require only token stylesheets, or "strict" (default) for all rules.`,
    );
  }

  if (!Array.isArray(tokenFiles) || tokenFiles.length === 0) {
    throw new Error(
      'design-lint: `tokenFiles` is required — the stylesheets your `--color-*` tokens are defined in, e.g. ["src/styles.css"]. Without them no rule can tell a token from a typo, and a rule that cannot tell reports nothing.',
    );
  }

  // Strict requires component import globs; [] explicitly disables the component check.
  // Basic rejects this option because it does not enable the component rule.
  if (preset === "basic" && componentSources !== undefined) {
    throw new Error(
      'design-lint: The "basic" preset does not turn on no-component-color-override. Remove `componentSources`, or use preset: "strict" to check component colors.',
    );
  }
  if (preset === "strict" && componentSources === undefined) {
    throw new Error(
      'design-lint: `componentSources` is required by the "strict" preset (default). Provide import globs for your design-system components, matching imports exactly: for "#/components/ui/button", use ["#/components/ui/*"]. Pass [] if you have no component library, or use preset: "basic".',
    );
  }

  const paths = tokenFiles.map((file) => (isAbsolute(file) ? file : join(base, file)));
  const missing = paths.filter((path) => !existsSync(path));
  if (missing.length > 0) {
    throw new Error(
      `design-lint: \`tokenFiles\` names ${missing.length === 1 ? "a file that does not exist" : "files that do not exist"}: ${missing.join(", ")}. Relative paths are resolved from ${base}.`,
    );
  }

  // The design system is built from an entry that imports each token file by absolute
  // path, not from their text pasted together. Pasted, a token file's own
  // `@import "./tokens.css"` resolves from the working directory instead of from where the
  // file sits; imported, the engine resolves it the way the build does.
  const entry = paths.map((path) => `@import ${JSON.stringify(path)};`).join("\n");

  // Yours is your namespace minus Tailwind's stock palette — see `projectTokens`. The two
  // are built side by side, by the same engine.
  const [designSystem, palette] = await Promise.all([
    loadDesignSystem(entry, { base }).then((system) => designSystemPolicy(system)),
    loadPalette({ base }).then((system) => designSystemPolicy(system)),
  ]);
  const tokens = projectTokens(designSystem, palette);

  // Every rule that reads class strings asks which utilities take a colour, and a theme with
  // no colour answers "none" — so the lint run would pass on every file and look clean.
  if (designSystem.colorPrefixes.size === 0) {
    throw new Error(
      `design-lint: your token stylesheets define no --color-* tokens (${tokenFiles.join(", ")}), so no rule can tell a colour class from any other class. Check that \`tokenFiles\` names the stylesheet that defines your colours, or the one that imports it.`,
    );
  }

  publish({ designSystem, tokens });

  const watching = preset === "strict" && componentSources.length > 0;
  const ids = PRESETS[preset].filter((id) => id !== "no-component-color-override" || watching);

  return {
    jsPlugins: ["@evilmartians/design-lint/oxlint"],
    rules: {
      ...Object.fromEntries(ids.map((id) => [`${namespace}/${id}`, severity])),
      // The options a consumer's own layout decides. Everything else a rule needs it carries
      // itself — the recommended policy is in `meta.defaultOptions`, or for token-constraints
      // applied in `create` — so restating a severity here, which replaces options wholesale,
      // still lands on the right behaviour.
      ...(watching && {
        [`${namespace}/no-component-color-override`]: [severity, { componentSources }],
      }),
    },
  };
}
