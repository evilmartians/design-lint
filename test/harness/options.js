import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { bindResolved } from "../../src/plugin.js";
import { designSystemPolicy } from "../../src/policy/design-system.js";
import { loadDesignSystem, loadPalette } from "../../src/policy/load.js";
import { projectTokens } from "../../src/policy/tokens.js";
import { rules } from "../../src/rules/index.js";

/**
 * Rule options the contracts are written against.
 *
 * These are fixtures, not the recommended policy. A rule's recommended policy is its own
 * default; this file supplies only what a consumer's config would, and the inputs the
 * factory would resolve from it.
 *
 * ## Resolved inputs, not paths
 *
 * Most rules need a design system or a semantic token set. Their contracts
 * configure that as `tokenFiles` — *paths*, because that is what a consumer
 * has — but no rule may read a file: paths are resolved once at plugin-module load and the
 * rules are handed the result. The corpus is that load step's stand-in, so it supplies the
 * resolved forms under the two keys a rule actually reads:
 *
 * | Option | What a rule gets |
 * | --- | --- |
 * | `designSystem` | the policy view from `designSystemPolicy()` — `colorPrefixes`, `resolves`, `isColorClass` |
 * | `tokens` | a `Set` of semantic token names, `--color-` prefix already stripped |
 *
 * Neither of those can travel through `options`: they cross a JSON boundary and arrive as
 * husks with every method gone. They are *bound* to the rule instead — see {@link ruleFor},
 * which is the corpus's stand-in for the plugin module's load step. `optionsFor` describes
 * the other half, the JSON a consumer actually writes.
 *
 * Which means the corpus can vary either one per case without inventing a stylesheet per
 * variation, and `RuleTester` never touches a
 * filesystem.
 */

/**
 * ## Why there is more than one design system here
 *
 * `theme.css` is a **probe surface**, not an application's palette: it exists so prefix
 * derivation can ask Tailwind what it generates, and it declares four deliberately generic
 * token names. Three contracts are written in token vocabularies it does not have —
 * `no-component-color-override` in `destructive` and `success-content`,
 * `no-undefined-token` in a palette that must *exclude* `danger-muted`, `token-constraints`
 * in fifteen names its contract lists in prose.
 *
 * Each of them resolves its own design system rather than widening the shared one, and that
 * is the rule to follow when a fourth needs the same thing. Widening `theme.css` moves every
 * other rule's verdicts as a side effect: adding `danger-muted` would make it defined for
 * `no-undefined-token`, and removing it would make it spectral for `no-spectral-color`. A
 * fixture that one rule can change to suit itself is a fixture no rule can rely on.
 */

const FIXTURE = fileURLToPath(new URL("../fixtures/theme.css", import.meta.url));
const BASE = fileURLToPath(new URL("../..", import.meta.url));

const css = readFileSync(FIXTURE, "utf-8");

/**
 * Loaded once for the whole corpus. Building a Tailwind design system is the most expensive
 * thing the test suite does, and it is the same design system for every case — which is
 * also true of the plugin this stands in for, where the cost is paid once per lint run
 * rather than once per file.
 */
export const designSystem = designSystemPolicy(await loadDesignSystem(css, { base: BASE }));

/**
 * Tailwind's own stock palette, subtracted from each fixture's namespace to leave the
 * fixture's tokens — exactly as the factory does, so the corpus and a real install cannot
 * disagree about which names are a project's own.
 */
const palette = designSystemPolicy(await loadPalette({ base: BASE }));

/** The semantic token names the fixture stylesheet defines. */
export const tokens = projectTokens(designSystem, palette);

/**
 * The semantic palette `no-component-color-override`'s corpus is written against.
 *
 * That rule decides whether a class carries a colour by asking whether its *value* is a
 * name in the theme's `--color` namespace — `text-destructive` is a colour and `text-sm` is
 * a font size, and nothing but the theme can tell them apart. Its contract is written in
 * the semantic vocabulary a design system actually has, so `theme.css`'s four probe names
 * are not enough: `destructive`, `danger`, `muted`, `info`, `success` and `border` have to
 * resolve for `text-destructive` to be a colour rather than a typo.
 *
 * So this is one more design system, resolved from the fixture stylesheet plus the names
 * that contract needs. It is deliberately *not* a change to `test/fixtures/theme.css`:
 * that file is a shared probe surface, and widening the colour namespace under every rule
 * would move `no-undefined-token`'s and `no-spectral-color`'s verdicts as a side effect of
 * a third rule's corpus. These names stand in for the consumer stylesheets passed to
 * `designLint()` as `tokenFiles` in production, which is exactly the input this whole file
 * is the load step's stand-in for.
 */
const SEMANTIC_PALETTE = [
  "destructive",
  "danger",
  "danger-weak",
  "danger-content",
  "muted",
  "info",
  "success",
  "success-content",
  "border",
];

export const semanticDesignSystem = designSystemPolicy(
  await loadDesignSystem(
    `${css}\n@theme {\n${SEMANTIC_PALETTE.map((name) => `  --color-${name}: oklch(0.7 0.1 25);`).join("\n")}\n}\n`,
    { base: BASE },
  ),
);

/**
 * The palette `no-undefined-token`'s corpus is written against.
 *
 * That rule is the one whose every verdict is a statement about what the design system does
 * *not* contain, so its corpus needs a stylesheet with deliberate gaps in it — and
 * `theme.css` above has the wrong ones. It defines `danger-muted`, which that contract
 * names as its running example of a token nobody defined, and it defines none of `warning`,
 * `input` or `success-content`, which the contract allows because they resolve. Under the
 * shared probe surface the rule would be right and the contract would look wrong.
 *
 * So this is a third design system, built from Tailwind core plus exactly the names that
 * contract says are there. It is deliberately *not* a change to `test/fixtures/theme.css`:
 * that file is a shared probe surface, and taking `danger-muted` out of it would move
 * `no-spectral-color`'s verdicts as a side effect of a fourth rule's corpus.
 *
 * It is built from `@import "tailwindcss"` rather than from `css` for the one reason
 * `semanticDesignSystem` above could layer onto it and this cannot: a `@theme` block can add
 * a colour to a design system, and nothing can take one away.
 *
 * `sparseTokens` is the same palette as names. The rule builds its typo candidates from it —
 * `bg-primry` is answered with `bg-primary` — and the two have to come from one stylesheet
 * or a candidate could name a token that does not resolve.
 */
const SPARSE_PALETTE = [
  "primary",
  "foreground",
  "warning",
  "input",
  "success-content",
  "success-muted",
];

const sparseCss = `@import "tailwindcss";\n@theme {\n${SPARSE_PALETTE.map((name) => `  --color-${name}: oklch(0.7 0.1 25);`).join("\n")}\n}\n`;

export const sparseDesignSystem = designSystemPolicy(
  await loadDesignSystem(sparseCss, { base: BASE }),
);

export const sparseTokens = projectTokens(sparseDesignSystem, palette);

/**
 * Only options the corpus actually depends on are listed. A contract that needs to vary one
 * of these per case defines its own `options=` fixture block, which is layered on top.
 */
/**
 * The `--color-*` names `token-constraints`' corpus is written against.
 *
 * Its contract names them in prose, under "Baseline semantic tokens", because every one of
 * its cases turns on whether a colour part is one of them — and `theme.css` above declares a
 * deliberately smaller, differently-named handful, since it exists to be a *probe surface*
 * rather than an application's palette. These names stand in for that rule's `tokenFiles`,
 * which is why they live here rather than in one of the contract's `options=` fixtures: a
 * fixture varies *policy* per case, and the token set is not policy.
 *
 * Bound as a `Set`, which is what the plugin module binds in production. It was a JSON list
 * here once, and that difference hid a rule that demanded an array: the corpus was green and
 * the installed package threw on the first file it linted.
 */
const TOKEN_CONSTRAINTS_TOKENS = [
  "primary",
  "primary-hover",
  "primary-focus",
  "primary-foreground",
  "muted",
  "muted-foreground",
  "foreground",
  "border",
  "input",
  "ring",
  "link",
  "link-hover",
  "warning",
  "warning-foreground",
  "danger",
];

const OPTIONS = {
  "no-component-color-override": [{ componentSources: ["@/components/ui/*"] }],
};

/**
 * The half no consumer could type. Listed per rule, because which rules need a design
 * system is a fact about the rules rather than about the fixture.
 */
const RESOLVED = {
  "no-arbitrary-radius": { designSystem },
  "no-arbitrary-typography": { designSystem },
  "no-component-color-override": { designSystem: semanticDesignSystem },
  "no-dark-variant": { designSystem },
  "no-opacity-modifier": { designSystem },
  "no-raw-color": { designSystem, tokens },
  "no-spectral-color": { designSystem, tokens },
  "no-undefined-token": { designSystem: sparseDesignSystem, tokens: sparseTokens },
  "token-constraints": { designSystem, tokens: new Set(TOKEN_CONSTRAINTS_TOKENS) },
};

/** The JSON options a case runs under — what a consumer writes in their config. */
export function optionsFor(rule) {
  return OPTIONS[rule] ?? [];
}

/**
 * The rule as the plugin module would have built it: bound to the inputs that cannot
 * survive JSON. Every test that runs a rule takes it from here rather than from
 * `src/rules/index.js`, so no test can accidentally exercise an unbound rule — which looks
 * like a rule whose design system has no methods, and fails a long way from the cause.
 */
export function ruleFor(rule) {
  return bindResolved(rules[rule], RESOLVED[rule]);
}
