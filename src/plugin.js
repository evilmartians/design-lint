/**
 * Binding resolved inputs to a rule.
 *
 * Rule options cross a JSON boundary. Oxlint hands a JS plugin its options from Rust as
 * JSON, and `RuleTester` round-trips them the same way, so anything with a method does not
 * survive the trip: a design-system policy arrives as `{ colorPrefixes: {} }` with every
 * function gone, and a `Set` arrives as `{}`. Nothing warns — the rule simply sees a husk.
 *
 * So the two halves of a rule's configuration travel differently:
 *
 * - **What a consumer writes** — `colorPrefixes`, `flagLightDark`, a replacement map — is
 *   JSON, and arrives through `options` as it should.
 * - **What a consumer cannot write by hand** — the resolved design system, the token set —
 *   is built once at plugin-module load from the paths they *did* write, and bound here.
 *
 * A rule reads both from `context.options[0]` and stays a pure function of its options,
 * which is the whole point: binding is one step in one place, not a second channel every
 * rule has to know about.
 *
 * Bound values are defaults, not overrides — anything the caller supplied for the same key
 * wins. That is what lets a contract vary a token set per case with a plain JSON list while
 * every other case runs against the resolved one.
 */

/**
 * A rule that sees `resolved` merged into its options.
 *
 * @param {object} rule an Oxlint rule object
 * @param {object} [resolved] inputs that cannot survive JSON — `designSystem`, `tokens`
 * @returns {object} the rule, bound
 */
export function bindResolved(rule, resolved) {
  if (!resolved || Object.keys(resolved).length === 0) return rule;

  return {
    ...rule,
    create: (context) =>
      rule.create(
        // A proxy rather than a copy: `context` carries accessors whose receiver must stay
        // the real context, so everything but `options` is read straight off it. The proxy
        // wraps an empty object, not `context`: ESLint freezes the context, and a proxy may
        // not answer for a frozen target's `options` with anything but its own array.
        new Proxy({}, {
          get: (_target, key) =>
            key === "options"
              ? [{ ...resolved, ...(context.options[0] ?? {}) }]
              : Reflect.get(context, key, context),
        }),
      ),
  };
}
