import { arbitraryValueRule } from "./arbitrary-value.js";

/**
 * no-arbitrary-typography — font size, font weight and letter spacing come from the theme's
 * scale, not from a value written in brackets.
 *
 * The specification is `test/contracts/no-arbitrary-typography.js`;
 * `docs/rules/no-arbitrary-typography.md` is the guide for the people using it. The shared
 * machinery — what counts as arbitrary, what is a reference, when a fix is offered — is in
 * `./arbitrary-value.js`.
 *
 * One rule rather than three because the three are one decision: a type scale. A project
 * migrating to one meets them together, and a report names which of the three it found.
 */
const WATCHED = {
  "font-size": { messageId: "arbitraryFontSize", namespace: "--text" },
  "font-weight": { messageId: "arbitraryFontWeight", namespace: "--font-weight" },
  "letter-spacing": { messageId: "arbitraryLetterSpacing", namespace: "--tracking" },
};

export default arbitraryValueRule({
  name: "no-arbitrary-typography",
  description: "Font size, font weight and letter spacing must come from the theme's scale.",
  watch: (property) => WATCHED[property] ?? null,
  messages: {
    arbitraryFontSize:
      "{{className}} — arbitrary font size {{value}}; use a text-* size from your theme, or add a --text-* token to your token stylesheet",
    arbitraryFontWeight:
      "{{className}} — arbitrary font weight {{value}}; use a font-* weight from your theme, or add a --font-weight-* token to your token stylesheet",
    arbitraryLetterSpacing:
      "{{className}} — arbitrary letter spacing {{value}}; use a tracking-* value from your theme, or add a --tracking-* token to your token stylesheet",
  },
});
