/**
 * Which resolved inputs each rule is bound to.
 *
 * A rule's *options* are what a consumer writes, and they are JSON. Its *inputs* are what
 * only a load step can produce — the design-system policy view and the semantic token set —
 * and they are bound around `create` instead. This map is the one place that says which rule
 * takes which, so the plugin and the test harness cannot drift into binding different
 * things.
 *
 * A rule absent from this map needs neither: `no-style-color` reads only its own options,
 * and `no-useless-hover` decides interactivity from the element, not from the theme.
 */
export const RESOLVED_INPUTS = {
  "no-ad-hoc-heading": ({ designSystem }) => ({ designSystem }),
  "no-arbitrary-radius": ({ designSystem }) => ({ designSystem }),
  "no-arbitrary-typography": ({ designSystem }) => ({ designSystem }),
  "no-component-color-override": ({ designSystem }) => ({ designSystem }),
  "no-dark-variant": ({ designSystem }) => ({ designSystem }),
  "no-opacity-modifier": ({ designSystem }) => ({ designSystem }),
  "no-raw-color": ({ designSystem, tokens }) => ({ designSystem, tokens }),
  "no-spectral-color": ({ designSystem, tokens }) => ({ designSystem, tokens }),
  "no-undefined-token": ({ designSystem, tokens }) => ({ designSystem, tokens }),
  "token-constraints": ({ designSystem, tokens }) => ({ designSystem, tokens }),
};
