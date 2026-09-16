import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { designSystemPolicy } from "../policy/design-system.js";
import { loadDesignSystem, loadPalette } from "../policy/load.js";
import { projectTokens } from "../policy/tokens.js";
import { publish } from "./resolved.js";

/**
 * The rules the factory turns on: every rule, at the consumer's `severity`.
 *
 * These are severities, not semantics. What each rule *means* lives in its contract and in
 * the rule itself, which carries the recommended policy — in `meta.defaultOptions`, or for
 * `token-constraints` in `create`, when neither `allowed` nor `denied` is written — so that
 * a consumer who wipes a rule's options by restating its severity lands on the right
 * behaviour rather than on nothing. This list only says which rules run.
 *
 * **Versioning.** A new rule ships **disabled** and joins this list only in a major
 * release. Adding one here turns a patch upgrade into a failing build for every consumer,
 * which teaches people to pin — and a linter nobody upgrades is a linter that stops
 * matching the design system it was written for.
 */
const RULE_IDS = [
  "no-component-color-override",
  "no-dark-variant",
  "no-opacity-modifier",
  "no-raw-color",
  "no-spectral-color",
  "no-style-color",
  "no-undefined-token",
  "no-useless-hover",
  "token-constraints",
];

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
  tokenFiles,
  componentSources,
  namespace = "design",
  severity = "error",
  base = process.cwd(),
} = {}) {
  if (!Array.isArray(tokenFiles) || tokenFiles.length === 0) {
    throw new Error(
      'design-lint: `tokenFiles` is required — the stylesheets your `--color-*` tokens are defined in, e.g. ["src/styles.css"]. Without them no rule can tell a token from a typo, and a rule that cannot tell reports nothing.',
    );
  }

  // `no-component-color-override` watches components by where they were imported from, so
  // it cannot run without being told where those live. Presence of the key is the decision:
  // a list turns the rule on, `[]` says this project has no design-system component library
  // and turns it off, and leaving it out at all is not a decision — it throws rather than
  // enabling a rule that fails on the first file, or quietly dropping one that was asked for.
  if (componentSources === undefined) {
    throw new Error(
      'design-lint: `componentSources` is required — the import globs your design-system components come from, matched against each import exactly as written — if your code imports "#/components/ui/button", pass ["#/components/ui/*"], even when another alias points at the same folder (a shadcn project records it as `aliases.ui` in components.json). It is how no-component-color-override knows which elements own their own colour. Pass `[]` if this project has no such library.',
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

  const watching = componentSources.length > 0;
  const ids = RULE_IDS.filter((id) => id !== "no-component-color-override" || watching);

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
