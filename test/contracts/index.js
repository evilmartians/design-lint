import noAdHocHeading from "./no-ad-hoc-heading.js";
import noArbitraryRadius from "./no-arbitrary-radius.js";
import noArbitraryTypography from "./no-arbitrary-typography.js";
import noComponentColorOverride from "./no-component-color-override.js";
import noDarkVariant from "./no-dark-variant.js";
import noOpacityModifier from "./no-opacity-modifier.js";
import noRawColor from "./no-raw-color.js";
import noSpectralColor from "./no-spectral-color.js";
import noStyleColor from "./no-style-color.js";
import noUndefinedToken from "./no-undefined-token.js";
import noUselessHover from "./no-useless-hover.js";
import tokenConstraints from "./token-constraints.js";

/**
 * Every rule's contract: what it promises to catch, what it deliberately allows, what it
 * cannot see, and what it will cover once CSS is linted.
 *
 * A contract is data, not a test. Each case is a plain object — `kind`, `group`, `code`,
 * and for a `caught` case the `reports` it must produce — so any linter can run the same
 * corpus through an adapter of its own. `oxlint.test.js` is the one that exists today.
 *
 * @typedef {object} Report
 * @property {string} id    The rule's message id.
 * @property {number} line  1-based, relative to the case's own code.
 * @property {number} column 1-based.
 * @property {number} endLine
 * @property {number} endColumn
 *
 * @typedef {object} Case
 * @property {"caught" | "allowed" | "blindspot" | "deferred"} kind
 *   `caught` must report exactly `reports`. `allowed` is silent by decision, `blindspot`
 *   silent because the rule cannot see it — both are asserted, so a blind spot that starts
 *   reporting fails. `deferred` is a surface not linted yet, recorded and never run.
 * @property {string} group The part of the contract the case belongs to.
 * @property {string} code
 * @property {string} [lang] Defaults to `tsx`.
 * @property {object} [options] Rule options, layered over the rule's defaults.
 * @property {Report[]} [reports] Required for `caught`.
 *
 * @typedef {object} Contract
 * @property {string} rule
 * @property {string} [preamble] Code prepended to every case, e.g. the imports that make a
 *   component watched.
 * @property {Case[]} cases
 */

/** @type {Contract[]} */
export const contracts = [
  noAdHocHeading,
  noArbitraryRadius,
  noArbitraryTypography,
  noComponentColorOverride,
  noDarkVariant,
  noOpacityModifier,
  noRawColor,
  noSpectralColor,
  noStyleColor,
  noUndefinedToken,
  noUselessHover,
  tokenConstraints,
];

/** The code a linter is handed: the contract's preamble, a blank line, then the case. */
export function sourceOf(contract, testCase) {
  return contract.preamble ? `${contract.preamble}\n\n${testCase.code}` : testCase.code;
}

/** How many lines the preamble pushes a case's own code down by. */
export function lineOffset(contract) {
  return contract.preamble ? contract.preamble.split("\n").length + 1 : 0;
}

/** The cases a JS/TS linter runs today: everything but `deferred`, in `tsx`. */
export function runnable(contract) {
  return contract.cases.filter((c) => c.kind !== "deferred" && (c.lang ?? "tsx") === "tsx");
}
