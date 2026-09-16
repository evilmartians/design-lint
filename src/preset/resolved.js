/**
 * The handoff between the two entry points.
 *
 * `/preset` runs inside the consumer's config file and resolves the design system from
 * their paths; `/oxlint` is loaded afterwards, by name, and needs the result. They share a
 * process and a module registry — measured, not assumed — so a module-level value is the
 * whole mechanism.
 *
 * The alternatives are all worse in ways the distribution constraints name outright: the
 * plugin finding a config file up the tree (a path derived from nothing the consumer
 * declared), parsing the config a second time (two readings that can disagree), or reading
 * a path relative to where the package was installed (forbidden outright). This is one
 * assignment and one read, in that order, in one process.
 */

let resolved = null;

/** Called by the factory, once, with what it resolved. */
export function publish(inputs) {
  resolved = inputs;
}

/**
 * Called by the plugin module at load. Throws rather than returning nothing: a plugin with
 * no design system is a plugin whose rules report nothing, which is indistinguishable from
 * a clean codebase.
 */
export function consume() {
  if (!resolved) {
    throw new Error(
      "design-lint: the plugin was loaded without a resolved design system. `@evilmartians/design-lint/oxlint` is loaded by `designLint()`, which resolves one first — list it through that factory in oxlint.config.ts rather than naming it in `jsPlugins` by hand.",
    );
  }
  return resolved;
}
