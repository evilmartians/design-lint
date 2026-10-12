import { arbitraryValueRule } from "./arbitrary-value.js";

/**
 * no-arbitrary-radius — corner radii come from the theme's scale, not from a value written
 * in brackets.
 *
 * The specification is `test/contracts/no-arbitrary-radius.js`;
 * `docs/rules/no-arbitrary-radius.md` is the guide for the people using it. The shared
 * machinery — what counts as arbitrary, what is a reference, when a fix is offered — is in
 * `./arbitrary-value.js`.
 *
 * Every corner and side form is one property family in CSS — `border-radius`,
 * `border-top-left-radius`, `border-start-start-radius` — so the property is matched by its
 * shape and `rounded-tl-[4px]` and `rounded-s-[4px]` arrive without a list.
 */
const RADIUS = /^border(?:-[a-z]+)*-radius$/;

export default arbitraryValueRule({
  name: "no-arbitrary-radius",
  description: "Corner radii must come from the theme's scale.",
  watch: (property) =>
    RADIUS.test(property) ? { messageId: "arbitraryRadius", namespace: "--radius" } : null,
  messages: {
    arbitraryRadius:
      "{{className}} — arbitrary border radius {{value}}; use a rounded-* step from your theme, or add a --radius-* token to your token stylesheet",
  },
});
