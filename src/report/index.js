import { rules } from "../rules/index.js";
import { parseDirectives } from "./directives.js";

/**
 * The integration report: how much of design-lint a project actually runs.
 *
 * A clean lint run says nothing about what was switched off to get there. This collects the
 * places coverage is given up — rules turned off in the config, violations silenced by
 * disable comments or Oxlint's bulk suppressions file, and paths the config keeps from the
 * linter — so they can be seen in one place.
 *
 * Everything here is a function of the config object, the file texts and the suppressions.
 * Finding the config, asking Oxlint which files it lints, and reading them is the CLI's job.
 */

export const PLUGIN = "@evilmartians/design-lint/oxlint";

const OFF = new Set(["off", "allow", 0]);

/**
 * @param {{ config: object, files: { path: string, text: string }[], suppressions?: object }} input
 *   `config` is the object the project's `oxlint.config.ts` exports; `files` are the files
 *   Oxlint lints with it; `suppressions` is the parsed `oxlint-suppressions.json`, if there
 *   is one.
 */
export function buildReport({ config, files, suppressions = {} }) {
  const configured = config.rules ?? {};
  const namespace = namespaceOf(configured);

  const disabled = Object.keys(rules).flatMap((id) => {
    const setting = configured[`${namespace}/${id}`];
    if (setting === undefined) return [{ id, reason: "not enabled" }];
    const severity = Array.isArray(setting) ? setting[0] : setting;
    return OFF.has(severity) ? [{ id, reason: "off" }] : [];
  });

  // Disable comments and bulk suppressions hide violations alike, so they are counted
  // together: how a rule was silenced matters less than how often. Keyed by the name as
  // written, so a comment naming a rule that does not exist — a typo, or a rule since
  // renamed — is still counted and visible rather than dropped.
  const byRule = new Map();
  const add = (rule, n) => {
    const id = rule.slice(namespace.length + 1);
    byRule.set(id, (byRule.get(id) ?? 0) + n);
  };
  let bare = 0;

  for (const { text } of files) {
    for (const directive of parseDirectives(text)) {
      const ours = directive.rules.filter((rule) => rule.startsWith(`${namespace}/`));
      if (directive.rules.length > 0 && ours.length === 0) continue;
      if (ours.length === 0) bare++;
      for (const rule of ours) add(rule, 1);
    }
  }

  // As `oxlint --suppress-all` writes them: `{ [path]: { [rule]: { count } } }`, paths
  // relative to where it runs. An entry for a file Oxlint does not lint hides nothing.
  const linted = new Set(files.map(({ path }) => path));
  for (const [path, entries] of Object.entries(suppressions)) {
    if (!linted.has(path)) continue;
    for (const [rule, { count = 0 } = {}] of Object.entries(entries ?? {})) {
      if (rule.startsWith(`${namespace}/`) && count > 0) add(rule, count);
    }
  }

  const sorted = [...byRule].sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
  return {
    pluginLoaded: (config.jsPlugins ?? []).some(
      (plugin) => (typeof plugin === "string" ? plugin : plugin?.specifier) === PLUGIN,
    ),
    namespace,
    ruleCount: Object.keys(rules).length,
    disabled,
    silenced: {
      byRule: sorted,
      bare,
      total: sorted.reduce((sum, [, n]) => sum + n, bare),
    },
    ignorePatterns: config.ignorePatterns ?? [],
  };
}

/**
 * The prefix `designLint({ namespace })` put on the rule ids, read back from the rules it
 * wrote. A project that never changed it — or that turned every rule off by leaving it out —
 * is on the default.
 */
function namespaceOf(configured) {
  for (const key of Object.keys(configured)) {
    const slash = key.lastIndexOf("/");
    if (slash > 0 && key.slice(slash + 1) in rules) return key.slice(0, slash);
  }
  return "design";
}

/** The report as text, for a terminal. */
export function renderReport(report, { configPath } = {}) {
  const { disabled, silenced, ignorePatterns } = report;
  const out = [`design-lint report — ${configPath ?? "oxlint config"}`, ""];

  if (!report.pluginLoaded) {
    out.push(`! ${PLUGIN} is not in jsPlugins, so no design rule runs at all.`, "");
  }

  out.push(`Disabled rules (${disabled.length} of ${report.ruleCount})`);
  out.push(...table(disabled.map(({ id, reason }) => [id, reason])));
  out.push("");

  out.push(`Silenced (${silenced.total})`);
  out.push(
    ...table([
      ...silenced.byRule.map(([id, n]) => [id, String(n)]),
      ...(silenced.bare > 0 ? [["(all rules, none named)", String(silenced.bare)]] : []),
    ]),
  );
  out.push("");

  out.push("Ignored paths (ignorePatterns)");
  out.push(...table(ignorePatterns.map((pattern) => [pattern])));

  return `${out.join("\n")}\n`;
}

function table(rows) {
  if (rows.length === 0) return ["  none"];
  const width = Math.max(...rows.map(([first]) => first.length));
  return rows.map(([first, ...rest]) => `  ${[first.padEnd(width), ...rest].join("  ")}`.trimEnd());
}
