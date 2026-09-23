/**
 * Is this string a raw colour?
 *
 * One question, asked by more than one rule. `no-raw-color` asks it of a Tailwind arbitrary
 * value, an SVG presentation attribute, a `style` property and a bare string constant;
 * `no-style-color`'s `shorthandProperties: "value"` mode asks it of a shorthand's value to
 * decide whether `border: "1px solid red"` is worth a diagnostic. One regex —
 * `/#[0-9a-fA-F]{3,8}\b|(?:rgb|rgba|…)\s*\(/` — is the obvious answer and a wrong one: it
 * can neither see `red` nor tell `fill="url(#gradient)"` from a colour.
 *
 * So the answer is a small scanner rather than a pattern, and it lives here rather than in
 * a rule, because a second copy of a 148-name list is a second thing to be wrong.
 *
 * ## Two readings, and why the difference is not a detail
 *
 * The contract's enforcement model is two models, and they need different answers to
 * "colour?" — which is the whole reason this module exposes two entry points instead of a
 * predicate:
 *
 * - {@link rawColorsIn} is for a **delimited colour context**: a colour-carrying property's
 *   value, a colour-carrying attribute's value, the bracket of a colour-carrying utility.
 *   The context is known to hold a colour, so a bare `red` is a colour and a literal buried
 *   in `0 0 4px #f00` is worth finding.
 * - {@link wholeValueColor} is for **no context at all**: a string constant that belongs to
 *   no property and no utility. Here only a string that is *entirely* one unambiguous
 *   literal counts, and bare words never do — otherwise `const label = "red"` and
 *   `{ name: "tomato" }` would report, which is precisely the false-positive class the
 *   contract refuses to accept.
 *
 * Everything else follows from those two. The scanner is shared; only the gate differs.
 *
 * ## What the scanner knows that a pattern cannot
 *
 * - **`url()` is an address.** The `#` in `url(#gradient-primary)` is a fragment
 *   identifier, not a hex colour.
 * - **`var()` is a reference**, which is the correct answer rather than a violation.
 * - **`color-mix()` and `light-dark()` compose.** They are a colour only when an argument is
 *   one, so `light-dark(#000,#fff)` reports and
 *   `light-dark(var(--a),var(--b))` does not. The call itself, tokens or not, is
 *   `no-dark-variant`'s to report.
 * - **`from` makes a colour function compose too.** In relative colour syntax the first
 *   argument is a colour rather than a number, so `oklch(from var(--accent) calc(l - 0.01) c h)`
 *   derives from a token and is a reference, exactly as `color-mix(in oklch, var(--accent), …)`
 *   is, while `oklch(from #f00 l c h)` reports.
 * - **Other functions are transparent.** `linear-gradient(#fff, #000)` is not itself a
 *   colour literal, but it contains two, and a gradient is where a colour most often hides
 *   from a property-name check.
 * - **A word is a word.** Names are matched as whole scanner tokens, never as substrings, so
 *   `animate-[fadeToRed_2s]` and `#decade` cannot be read as `red` and `decade`.
 */

import { NAMED_COLORS, SYSTEM_COLORS } from "./color-names.js";

export { NAMED_COLORS, SYSTEM_COLORS };

/**
 * Values that are not colours in the sense any of this cares about, and the
 * recommended default for the `ignoreValues` option.
 *
 * `currentColor` *is* a reference — it resolves to whatever the cascade produced, which
 * under these rules is always a token. `transparent` names the absence of a colour, and no
 * token could replace it. The rest name a cascade operation rather than a value. They are
 * listed rather than left to fall out of "not in the name set" because they are what people
 * write when they have done the right thing, and a rule that flagged them would teach
 * developers to suppress it.
 */
export const DEFAULT_IGNORED_VALUES = [
  "transparent",
  "currentColor",
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
];

/**
 * Functions that *are* a colour. Every one of them exists only to produce a colour, so the
 * call is the literal and its arguments are numbers — except under relative colour syntax,
 * where `from` puts a colour in front of the numbers and {@link relativeOrigin} finds it.
 */
const COLOR_FUNCTIONS = new Set([
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "color",
  "device-cmyk",
]);

/**
 * Functions that are a colour only when something inside them is. Both take colours as
 * arguments and hand back a colour, so the literal they contain is the thing that makes
 * them one — `color-mix(in oklch, var(--a), var(--b))` composes two references and is
 * itself a reference.
 */
const COMPOSED_FUNCTIONS = new Set(["color-mix", "light-dark"]);

/**
 * Functions whose contents are not a value at all: an address, and a reference. Their
 * arguments are not scanned, which is what keeps `url(#gradient-primary)` and
 * `var(--color-primary)` quiet.
 *
 * `var()`'s fallback — `var(--brand, red)` — is a real literal this declines to see. It is
 * a deliberate omission rather than an oversight: the fallback is the value used when the
 * token is *missing*, which is a different defect belonging to `no-undefined-token`, and no
 * contract asks for it here.
 */
const OPAQUE_FUNCTIONS = new Set(["url", "var"]);

/** Characters that end a scanner token. Everything else runs together into one word. */
const SEPARATORS = new Set([" ", "\t", "\n", "\r", "\f", ",", "/", "(", ")", "'", '"']);

/** A hex colour is three, four, six or eight digits — never five, and never seven. */
const HEX_LENGTHS = new Set([3, 4, 6, 8]);
const HEX_DIGITS = /^[0-9a-fA-F]+$/;

/** A bare CSS keyword. Anything starting with a digit or a `-` is a number or a token name. */
const KEYWORD = /^[a-zA-Z][\w-]*$/;

/**
 * Every raw colour literal in a value that is known to carry one, in source order.
 *
 * @param {string} value a CSS value — a declaration's value, an attribute's value, or the
 *   inside of a Tailwind arbitrary-value bracket with its `_` already spelled as spaces
 * @param {{ namedColors?: boolean, ignoreValues?: string[] }} [options]
 *   `namedColors` governs the bare keywords — the 148 named colours and the 19 system
 *   colours alike, since both are recognised the same way and only in a context like this
 *   one. `ignoreValues` names the values that are references or cascade operations.
 * @returns {string[]} the literals as written: `#f00`, `rgb(255, 0, 0)`, `red`. A colour
 *   function counts once, as the whole call, rather than as the numbers inside it.
 */
export function rawColorsIn(value, options = {}) {
  if (typeof value !== "string" || !value) return [];

  const { namedColors = true, ignoreValues = DEFAULT_IGNORED_VALUES } = options;
  const ignored = new Set(ignoreValues.map((entry) => entry.toLowerCase()));

  // A value that is entirely one of the sanctioned keywords is not inspected at all. The
  // per-word skip below would reach the same verdict for every keyword on today's list —
  // none of them is a colour name — but this is the reading the option's documentation
  // describes, and it stays correct if a project ever ignores a value that *is* one.
  if (ignored.has(value.trim().toLowerCase())) return [];

  return scan(value, { namedColors, ignored });
}

/**
 * The first raw colour in a value that is known to carry one, or `null`.
 *
 * The convenience every caller wants: a report names one value however many literals the
 * string holds, because the contract's granularity is one report per property, per
 * attribute or per class token. This is also the entry point `no-style-color`'s
 * `shorthandProperties: "value"` mode is waiting for.
 *
 * @returns {string | null}
 */
export function firstRawColor(value, options = {}) {
  return rawColorsIn(value, options)[0] ?? null;
}

/**
 * The colour a string is, when the string is nothing but a colour — otherwise `null`.
 *
 * This is the value-scoped backstop's whole test, and both halves of it are deliberate.
 *
 * **Whole-string.** A literal spliced into a longer string is a declared blind spot:
 * `"color: #ff0000; padding: 4px"` is CSS in a string, not a colour, and recovering the
 * colour from it means parsing an embedded grammar. So a match must span the entire trimmed
 * string.
 *
 * **Never a bare word.** `red` and `tomato` are ordinary English, and outside a
 * colour-carrying context there is nothing to say which one a string means. `namedColors`
 * therefore defaults to `false` here — the opposite of {@link rawColorsIn} — and a caller
 * that turns it on is asking for `const label = "red"` to report.
 *
 * @returns {string | null} the literal, which is the trimmed string itself
 */
export function wholeValueColor(value, options = {}) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const hits = rawColorsIn(trimmed, { namedColors: false, ...options });
  return hits.length === 1 && hits[0] === trimmed ? trimmed : null;
}

/**
 * The scanner.
 *
 * A hand-rolled walk rather than a CSS parser, because the input is one value rather than a
 * stylesheet and the only structure that matters is the function call — which is the one
 * thing a regular expression cannot balance.
 *
 * @param {string} value
 * @param {{ namedColors: boolean, ignored: Set<string> }} state
 * @returns {string[]}
 */
function scan(value, state) {
  const hits = [];
  let i = 0;

  while (i < value.length) {
    const char = value[i];

    // A quoted span is text — a font family, a `content` string, a path inside `url()`.
    if (char === "'" || char === '"') {
      i = endOfQuoted(value, i);
      continue;
    }

    if (SEPARATORS.has(char)) {
      i++;
      continue;
    }

    const end = endOfWord(value, i);
    const word = value.slice(i, end);

    // A word standing immediately against `(` is a function name. "Immediately" is what
    // keeps `color-mix` from being read as `color`: the word runs to the paren, so the
    // longest name wins without anybody ordering the sets.
    if (value[end] === "(") {
      const close = endOfCall(value, end);
      // The arguments stop before the `)`, and there is no `)` to stop before when the call
      // never closed — taking `close - 1` either way would eat the last character of a
      // malformed value, which is a colour it would then fail to find.
      const argsEnd = value[close - 1] === ")" ? close - 1 : close;
      pushCall(hits, word, value.slice(end + 1, argsEnd), value.slice(i, close), state);
      i = close;
      continue;
    }

    const hit = keywordColor(word, state);
    if (hit) hits.push(hit);
    i = end;
  }

  return hits;
}

/** Whatever one function call contributes. */
function pushCall(hits, name, args, whole, state) {
  const lower = name.toLowerCase();

  if (OPAQUE_FUNCTIONS.has(lower)) return;
  if (COLOR_FUNCTIONS.has(lower)) {
    // A zero alpha is `transparent` spelled another way: nothing is painted, and no token
    // could replace it, which is why `transparent` itself is allowed.
    if (ZERO.test(alphaOf(args) ?? "")) return;

    // Relative colour syntax composes, so the call is whatever its origin is. Only the
    // origin is scanned: the channels after it are numbers and single-letter keywords, and
    // reading them as values would be asking the question this branch exists to avoid.
    const origin = relativeOrigin(args);
    if (origin !== null) {
      if (scan(origin, state).length > 0) hits.push(whole);
      return;
    }

    hits.push(whole);
    return;
  }

  const inner = scan(args, state);
  if (COMPOSED_FUNCTIONS.has(lower)) {
    // One hit for the composition, not one per argument: the author wrote a single value
    // and has a single edit to make.
    if (inner.length > 0) hits.push(whole);
    return;
  }

  // Any other function — a gradient, a filter, `calc()` — is transparent. It is not a
  // colour, and whatever colours it holds are still colours.
  hits.push(...inner);
}

/** A bare word that names a colour, or `null`. */
function keywordColor(word, { namedColors, ignored }) {
  if (word.startsWith("#")) return hexColor(word);
  if (!namedColors || !KEYWORD.test(word)) return null;

  const lower = word.toLowerCase();
  if (ignored.has(lower)) return null;
  return NAMED_COLORS.has(lower) || SYSTEM_COLORS.has(lower) ? word : null;
}

/**
 * A `#`-prefixed word that is a hex colour, or `null`.
 *
 * The length check is the whole point. `#app-root`, `#pricing` and `#1234567` all begin
 * with a `#` and none is a colour — a seven-digit hex is not a colour in any CSS that has
 * ever shipped, whatever a `\b`-anchored pattern makes of it.
 */
function hexColor(word) {
  const digits = word.slice(1);
  if (!HEX_DIGITS.test(digits) || !HEX_LENGTHS.has(digits.length)) return null;
  // A zero alpha — `#0000`, `#ff000000` — is `transparent` spelled another way.
  if (digits.length === 4 && digits[3] === "0") return null;
  if (digits.length === 8 && digits.endsWith("00")) return null;
  return word;
}

/**
 * The origin colour of a relative colour — the argument between `from` and the channels —
 * or `null` when these arguments are not relative colour syntax.
 *
 * `oklch(from var(--accent) calc(l - 0.01) c h)` gives `var(--accent)` and
 * `oklch(0.7 0.15 30)` gives `null`. The origin is a single token, a call or a word, so it
 * ends where its balanced call does or where the next separator is; the channels that
 * follow are none of this function's business.
 */
function relativeOrigin(args) {
  let i = firstWord(args, 0);
  const keywordEnd = endOfWord(args, i);
  if (args.slice(i, keywordEnd).toLowerCase() !== "from") return null;

  i = firstWord(args, keywordEnd);
  if (i >= args.length) return null;

  const end = endOfWord(args, i);
  return args[end] === "(" ? args.slice(i, endOfCall(args, end)) : args.slice(i, end);
}

/** The index of the next character that begins a word, or the end of the string. */
function firstWord(value, start) {
  let i = start;
  while (i < value.length && SEPARATORS.has(value[i])) i++;
  return i;
}

/** The index just past the word beginning at `start`. */
function endOfWord(value, start) {
  let i = start;
  while (i < value.length && !SEPARATORS.has(value[i])) i++;
  return i;
}

/** An alpha of zero, written any way CSS allows: `0`, `0.0`, `.0`, `0%`. */
const ZERO = /^[+-]?(?:0+\.?0*|\.0+)%?$/;

/**
 * The alpha a colour function's arguments give, or `null` when they give none.
 *
 * Two syntaxes: the modern one puts it after a `/` (`rgb(0 0 0 / 0.5)`, `oklch(… / 0)`), the
 * legacy one as a fourth comma-separated argument (`rgba(0, 0, 0, 0.5)`). Both are read at
 * the top level only, so a `/` inside `calc()` is arithmetic rather than an alpha.
 */
function alphaOf(args) {
  let depth = 0;
  let slash = -1;
  const commas = [];
  for (let i = 0; i < args.length; i++) {
    const char = args[i];
    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (depth === 0 && char === "/") slash = i;
    else if (depth === 0 && char === ",") commas.push(i);
  }
  if (slash !== -1) return args.slice(slash + 1).trim();
  if (commas.length === 3) return args.slice(commas[2] + 1).trim();
  return null;
}

/** The index just past a quoted span, or the end of the string if it never closes. */
function endOfQuoted(value, start) {
  const quote = value[start];
  for (let i = start + 1; i < value.length; i++) {
    if (value[i] === "\\") i++;
    else if (value[i] === quote) return i + 1;
  }
  return value.length;
}

/**
 * The index just past the `)` matching the `(` at `open`, or the end of the string when the
 * call never closes — an unbalanced value is malformed, and scanning the rest of it as
 * arguments is a better failure than dropping it.
 */
function endOfCall(value, open) {
  let depth = 0;
  for (let i = open; i < value.length; i++) {
    const char = value[i];
    if (char === "'" || char === '"') {
      i = endOfQuoted(value, i) - 1;
    } else if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return value.length;
}
