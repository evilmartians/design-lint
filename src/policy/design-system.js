/**
 * The Tailwind design system, and the two questions rules ask of it.
 *
 * Three rules need to know things that only Tailwind can answer — which utility prefixes
 * carry a colour, whether a class generates any CSS at all, and whether a *particular*
 * class sets a colour. A hand-written prefix list answers the first and never asks the
 * third, and it is wrong in both directions: `text-sm/6` reports, because `text-` is a
 * colour prefix, and `inset-ring-primary` is invisible, because nobody listed `inset-ring`.
 *
 * Everything here is **derived by probing the design system**. Nothing is a list someone
 * has to remember to update when Tailwind adds a utility family.
 *
 * ## What this needs, and what it does not
 *
 * It needs `tailwindcss` and *a* stylesheet. It does not need the consuming project's
 * stylesheet, and the difference decides where this module can be built and tested.
 * Two separate facts decide whether a class carries colour:
 *
 * - **Which utilities exist, and what each generates.** `bg-*` sets `background-color`
 *   and `text-<size>` sets `font-size` in every project there has ever been. This comes
 *   from Tailwind core, and `@import "tailwindcss";` on its own loads all of it.
 * - **Which token names resolve.** `bg-primary` is a project's own business, and that is
 *   what the consumer's `tokenFiles` supply at load.
 *
 * Prefix derivation asks only the first. So it is probed against whatever design system
 * was loaded, and the fixture in `test/fixtures/theme.css` is a *wider* probe surface than
 * a real application stylesheet — a project that narrows the default palette narrows what
 * a probe can see.
 *
 * The one genuinely project-specific input is a Tailwind plugin that introduces a new
 * colour prefix, and that arrives through the `colorPrefixes` option, which *adds* to the
 * derived set rather than replacing it.
 */

import { colorProperty } from "./properties.js";

/**
 * The colour a class list is probed with to find the utilities that accept one.
 *
 * Any colour the theme defines would do. It is a probe, not a policy: it asks "which
 * utilities accept a colour here?", and the answer is a property of Tailwind rather than of
 * this choice. `red-500` is preferred because it is always there in a stock setup, which
 * keeps the derived set stable — but a project that resets the palette has no `red-500`,
 * and probing for it there would derive nothing and leave every prefix-gated rule silent.
 */
const PROBE_TOKEN = "red-500";

/**
 * Colour names a probe must avoid: each is also a non-colour value somewhere, so
 * `text-lg` or `border-2` would carry `text` and `border` in for the wrong reason and bring
 * `leading`, `rounded` and the rest in with them.
 */
const VALUE_LIKE = /^(?:\d|x*s$|sm$|md$|x*l$|\dxl$|base$|full$|none$|auto$|px$|inherit$|current$)/;

/**
 * The name to probe with: `red-500` when the theme has it, otherwise the first of its own
 * colours that cannot be mistaken for a size. `null` when the theme defines no colour.
 */
function probeName(colorNames) {
  if (colorNames.has(PROBE_TOKEN)) return PROBE_TOKEN;
  const names = [...colorNames].sort();
  return names.find((name) => !VALUE_LIKE.test(name)) ?? names[0] ?? null;
}

/** Tailwind's own namespace for theme colours. A value mentioning one names a colour. */
const THEME_COLOR_VAR = /var\(\s*--color-[\w-]/;

/**
 * The colour keywords Tailwind accepts under a colour prefix without a theme entry. They set a
 * colour, so they count — as they do in `no-component-color-override`.
 */
const COLOR_KEYWORDS = new Set(["current", "transparent", "inherit"]);

/** Tailwind's theme namespace for colours. Every colour a class can name lives under it. */
const COLOR_NAMESPACE = "--color";

/**
 * @typedef {{
 *   colorPrefixes: Set<string>,
 *   colorNames: Set<string>,
 *   resolves: (className: string) => boolean,
 *   isColorClass: (className: string) => boolean,
 *   parseRoot: (className: string) => string | null,
 *   declarations: (className: string) => { property: string, value: string }[] | null,
 *   arbitraryDeclarations: (className: string) => { property: string, value: string }[] | null,
 *   themeNameOf: (namespace: string, value: string) => string | null,
 * }} DesignSystemPolicy
 */

/**
 * Collect the declarations a candidate generates, from **style rules only**.
 *
 * The at-rule carve-out is not tidiness. Tailwind emits `@property` blocks alongside the
 * utilities that need them, and their descriptors include `syntax: "<color>"` — so a
 * colour test that walked every node would find the word `color` under `from-50%`, a
 * gradient *stop position* with no colour in it. Descriptors describe a custom property;
 * they do not style anything.
 *
 * @param {unknown[]} nodes
 * @param {{ property: string, value: string }[]} out
 */
function declarationsInRules(nodes, out) {
  for (const node of nodes ?? []) {
    if (node.kind === "declaration") out.push(node);
    // Recurse through rules — nesting and `:where(...)` wrappers are ordinary — but never
    // into at-rules, which is where `@property` descriptors live.
    else if (node.kind === "rule") declarationsInRules(node.nodes, out);
  }
}

/**
 * Build the policy view of a loaded Tailwind design system.
 *
 * The design system arrives already loaded. This module resolves no path and reads no
 * file: loading needs `tailwindcss`, a stylesheet and a filesystem, and every one of those
 * is the caller's to supply — see `loadDesignSystem` in `./load.js`, which is the only
 * place in the package that touches disk for this.
 *
 * @param {object} designSystem A resolved Tailwind design system.
 * @param {{ extraPrefixes?: string[] }} [options]
 * @returns {DesignSystemPolicy}
 */
export function designSystemPolicy(designSystem, { extraPrefixes = [] } = {}) {
  const parseRoot = (className) => {
    const [candidate] = designSystem.parseCandidate(className) ?? [];
    return candidate?.root ?? null;
  };

  /**
   * Every colour name a class can carry: `red-500`, `white`, and the project's own
   * `primary` alike.
   *
   * The theme's `--color` namespace is the only place the two are the same kind of thing,
   * which is exactly what `no-spectral-color` needs — it asks whether the colour part of a
   * class is a colour *the project did not define*, and subtracting the semantic token set
   * from this leaves the palette. Note what is absent: `transparent`, `current` and
   * `inherit` are keywords Tailwind handles itself rather than theme colours, so a rule
   * that gates on this set gets them allowed for free.
   */
  const colorNames = new Set(designSystem.theme.namespace(COLOR_NAMESPACE).keys());

  /**
   * Every utility root that accepts a colour.
   *
   * Derived by enumerating the class list and keeping the roots of every class the probe
   * colour completes. This is where `inset-ring-`, `text-shadow-`, `mask-*-from-` and the
   * per-side border families arrive without anyone maintaining a list — the whole reason
   * the derivation exists. A theme with no colour at all derives none, and the factory
   * refuses to start rather than hand the rules an empty set.
   */
  const probe = probeName(colorNames);
  const colorPrefixes = new Set(extraPrefixes);
  if (probe) {
    for (const [className] of designSystem.getClassList()) {
      if (!className.endsWith(`-${probe}`)) continue;
      const root = parseRoot(className);
      if (root) colorPrefixes.add(root);
    }
  }

  const declarationsOf = (className) => {
    const [ast] = designSystem.candidatesToAst([className]);
    if (!ast) return null;
    const declarations = [];
    declarationsInRules(ast, declarations);
    // Tailwind answers an unknown *value* under a known root — `ring-2/50`, `border-2/50` —
    // with an empty node list rather than a null. Generating nothing and being unknown are
    // the same fact to every rule that asks, so they are the same answer here.
    return declarations.length > 0 ? declarations : null;
  };

  /**
   * The properties a root sets when it is handed a colour, as one comparable string, or
   * `null` where Tailwind will not say — a plugin prefix may take no arbitrary value.
   *
   * Asked with an arbitrary value under a `color:` hint, because nothing in a theme can
   * intercept one: `shadow-red-500` would do in a stock theme, but a theme defining
   * `--shadow-red-500` turns it into the very box shadow this is meant to tell apart.
   * Memoised: a root is asked about once per class, and its answer never changes.
   */
  const colorShapes = new Map();
  const colorShapeOf = (root) => {
    if (!colorShapes.has(root)) {
      const declarations = declarationsOf(`${root}-[color:#000]`);
      colorShapes.set(root, declarations ? shapeOf(declarations) : null);
    }
    return colorShapes.get(root);
  };

  return {
    colorPrefixes,
    colorNames,
    parseRoot,

    /** The declarations a class generates, or `null` where it generates none. */
    declarations: declarationsOf,

    /**
     * The declarations of a class whose value is written in brackets — `text-[13px]`, or the
     * arbitrary property `[font-size:13px]` — and `null` for any other class.
     *
     * The caller strips variants, the important modifier and the opacity modifier first.
     */
    arbitraryDeclarations(className) {
      const [candidate] = designSystem.parseCandidate(className) ?? [];
      if (!candidate) return null;
      if (candidate.kind !== "arbitrary" && candidate.value?.kind !== "arbitrary") return null;
      return declarationsOf(className);
    },

    /**
     * The theme name whose value is exactly `value` in a namespace — `semibold` for `600`
     * under `--font-weight` — or `null`. Sub-keys such as `--text-sm--line-height` are not
     * names a utility takes, and are skipped. No unit is converted: `14px` does not match
     * `0.875rem`.
     */
    themeNameOf(namespace, value) {
      for (const [name, entry] of designSystem.theme.namespace(namespace)) {
        if (!name || name.includes("--")) continue;
        if (entry === value) return name;
      }
      return null;
    },

    /**
     * Does this class generate CSS?
     *
     * `no-undefined-token`'s whole predicate. The caller strips variants, the important
     * modifier and the opacity modifier first: those decide *when* a declaration applies,
     * never *whether* one exists.
     */
    resolves(className) {
      return declarationsOf(className) !== null;
    },

    /**
     * Does this class set a colour?
     *
     * The second gate for `no-opacity-modifier`, and the answer to the near-miss that
     * makes prefix matching alone unusable: `text-` is a colour prefix *and* a font-size
     * prefix, so `text-sm/6` and `text-primary/50` are the same shape and opposite
     * verdicts.
     *
     * The test is on the **value**, not the property. Property names do not partition:
     * `fill` and `stroke` carry colours without saying so, while `--tw-shadow` carries
     * `rgb(0 0 0 / 0.1)` as a *default* that no token was asked for — which is why
     * `shadow-sm/50` resolves, contains a literal colour, and still is not a colour class.
     * Its body is `sm`, and the contract's gate is that the body names a colour.
     *
     * So a class is colour-carrying when it either reaches into the theme's colour
     * namespace, or names a colour outright in an arbitrary value.
     */
    isColorClass(className) {
      const declarations = declarationsOf(className);
      if (!declarations) return false;

      // A class whose value is a *name* is a colour exactly when the theme says the name is
      // one. That is the question `no-spectral-color` and `no-component-color-override` ask,
      // and it is answered from the `--color` namespace, not from the CSS the class emits.
      //
      // The CSS cannot answer it under `@theme inline`, which is what shadcn/ui writes and so
      // what a large share of Tailwind v4 projects run. Inline substitutes a token's value
      // instead of referencing it, so `ring-primary` emits `--tw-ring-color: var(--primary)`:
      // no `--color-` in the value, and a Tailwind-internal custom property rather than a
      // colour property. Twenty-eight of forty-nine colour prefixes set their colour that way
      // — `ring-`, `shadow-`, the gradient stops, every `mask-*` family — and every rule gated
      // on this one was silent on all of them. Inline does not touch the namespace.
      //
      // A name in the namespace is necessary but not enough. A theme may define the same name
      // in a second namespace the root also reads, and Tailwind then picks one: with
      // `--color-card` and `--shadow-card` both defined, `shadow-card` is a box shadow, while
      // `text-card` stays a colour beside `--text-card`. Which one it picked shows in the
      // properties it set, and those do not depend on how the theme was written, so the
      // class is compared with the root given a colour outright: `shadow-[color:#000]` sets
      // `--tw-shadow-color`, `shadow-card` sets `--tw-shadow` and `box-shadow`. For every
      // root, a real colour name and the keywords set exactly those properties.
      const [candidate] = designSystem.parseCandidate(className) ?? [];
      if (candidate?.value?.kind === "named") {
        if (!colorPrefixes.has(candidate.root)) return false;
        const name = candidate.value.value;
        if (!colorNames.has(name) && !COLOR_KEYWORDS.has(name)) return false;
        const shape = colorShapeOf(candidate.root);
        return shape === null || shape === shapeOf(declarations);
      }

      // Everything else names no theme colour, so the CSS is the only evidence there is.
      //
      // A token referenced from inside an arbitrary value, however deeply wrapped:
      // `bg-[color-mix(in_oklab,var(--color-primary)_50%,transparent)]`.
      if (declarations.some((d) => THEME_COLOR_VAR.test(d.value))) return true;

      // The property, where there is no value to look up: `[color:red]` is an arbitrary
      // property. Only the colour-only reading counts: a shorthand is how
      // `bg-[image:var(--x)]`, which lands in `background-image`, would sneak back in.
      if (declarations.some((d) => colorProperty(d.property) === "color")) return true;

      // An arbitrary value names its colour directly and never touches the namespace:
      // `text-[#fff]` generates `color: #fff`. The root gate matters here — it is what
      // keeps `bg-[image:var(--x)]`, whose type hint sends it to `background-image`, from
      // being read as a colour just because `bg` can carry one.
      if (!candidate || candidate.value?.kind !== "arbitrary") return false;
      if (!colorPrefixes.has(candidate.root)) return false;
      return declarations.some((d) => isColorProperty(d.property));
    },
  };
}

/** The distinct properties a list of declarations sets, in a stable order. */
function shapeOf(declarations) {
  return [...new Set(declarations.map((d) => d.property))].sort().join(",");
}

/**
 * Does this property hold a colour?
 *
 * Only reached for arbitrary values, where there is no theme reference to follow. The
 * `-color` suffix covers `background-color`, `border-inline-color`, `--tw-ring-color` and
 * every custom property Tailwind names that way; `fill` and `stroke` are the two SVG
 * paint properties that carry a colour without saying so in their name.
 */
function isColorProperty(property) {
  return property === "color" || property.endsWith("-color") || property === "fill" || property === "stroke";
}
