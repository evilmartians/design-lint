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
 * Every rule, keyed by the id that appears in a diagnostic and in an
 * `oxlint-disable` comment. The key must match the `rule` of a contract in
 * `test/contracts/`, and the contract tests fail if the two sets ever diverge.
 */
export const rules = {
  "no-arbitrary-radius": noArbitraryRadius,
  "no-arbitrary-typography": noArbitraryTypography,
  "no-component-color-override": noComponentColorOverride,
  "no-dark-variant": noDarkVariant,
  "no-opacity-modifier": noOpacityModifier,
  "no-raw-color": noRawColor,
  "no-spectral-color": noSpectralColor,
  "no-style-color": noStyleColor,
  "no-undefined-token": noUndefinedToken,
  "no-useless-hover": noUselessHover,
  "token-constraints": tokenConstraints,
};
