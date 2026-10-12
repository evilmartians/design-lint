import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";

import { bindResolved } from "../../src/plugin.js";
import { designSystemPolicy } from "../../src/policy/design-system.js";
import { loadDesignSystem } from "../../src/policy/load.js";
import noComponentColorOverride from "../../src/rules/no-component-color-override.js";
import noArbitraryTypography from "../../src/rules/no-arbitrary-typography.js";
import noOpacityModifier from "../../src/rules/no-opacity-modifier.js";
import noSpectralColor from "../../src/rules/no-spectral-color.js";
import tokenConstraints from "../../src/rules/token-constraints.js";

/**
 * A name the theme defines as a colour and as something else.
 *
 * A theme may give one name to two namespaces a utility reads: `--color-card` and
 * `--shadow-card`. Tailwind then picks one, and the shadow families pick the shadow —
 * `shadow-card` is a box shadow — while `text-card` stays a colour beside `--text-card`.
 * Every rule that finds colour classes by name would call `shadow-card` a colour, and a
 * real codebase reported it on a design-system component and under a hover policy.
 *
 * The contracts cannot say this: they run against fixed design systems, and this needs one
 * with the clash in it. So the promise is asserted here, for the design system's own test
 * and for each rule that looks a colour up by name.
 */

const CLASH = `@import "tailwindcss";
@theme {
  --color-card: oklch(0.95 0 0);
  --color-primary: oklch(0.6 0.2 25);
  --shadow-card: 0 1px 2px black;
  --inset-shadow-card: inset 0 1px black;
  --drop-shadow-card: 0 1px 2px black;
  --text-shadow-card: 0 1px black;
  --text-card: 12px;
  --shadow-red-500: 0 1px 2px black;
}`;

const designSystem = designSystemPolicy(
  await loadDesignSystem(CLASH, { base: fileURLToPath(new URL("../..", import.meta.url)) }),
);
const tokens = new Set(["card", "primary"]);

describe("isColorClass under a name clash", () => {
  it("is not a colour where Tailwind generated the other namespace", () => {
    for (const className of [
      "shadow-card",
      "inset-shadow-card",
      "drop-shadow-card",
      "text-shadow-card",
      "shadow-red-500",
    ]) {
      expect(designSystem.isColorClass(className), className).toBe(false);
    }
  });

  it("is a colour where Tailwind generated the colour", () => {
    for (const className of ["bg-card", "text-card", "shadow-primary", "inset-shadow-primary", "bg-red-500"]) {
      expect(designSystem.isColorClass(className), className).toBe(true);
    }
  });
});

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: "tsx" } },
});

const card = 'import { Card } from "@/ui/card";\n';
const watching = [{ componentSources: ["@/ui/*"] }];

tester.run(
  "no-component-color-override — a shadow sharing a colour's name",
  bindResolved(noComponentColorOverride, { designSystem }),
  {
    valid: [{ code: `${card}<Card className="shadow-card inset-shadow-card" />;`, options: watching }],
    invalid: [
      {
        code: `${card}<Card className="shadow-primary text-card" />;`,
        options: watching,
        errors: [{ messageId: "colorOnComponent" }, { messageId: "colorOnComponent" }],
      },
    ],
  },
);

tester.run(
  "token-constraints — a shadow sharing a token's name",
  bindResolved(tokenConstraints, { designSystem, tokens }),
  {
    valid: ['<div className="hover:shadow-card" />;'],
    invalid: [{ code: '<div className="hover:shadow-primary" />;', errors: 1 }],
  },
);

tester.run(
  "no-spectral-color — a shadow sharing a palette name",
  bindResolved(noSpectralColor, { designSystem, tokens }),
  {
    valid: ['<div className="shadow-red-500" />;'],
    invalid: [{ code: '<div className="text-shadow-red-500" />;', errors: 1 }],
  },
);

tester.run(
  "no-opacity-modifier — a shadow sharing a colour's name",
  bindResolved(noOpacityModifier, { designSystem }),
  {
    valid: ['<div className="shadow-card/50" />;'],
    invalid: [{ code: '<div className="bg-card/50" />;', errors: 1 }],
  },
);

// `--text-card: 12px` is the value `text-[12px]` names, but `text-card` is a colour here, so
// offering it would swap a font size for a colour. The report stays; the suggestion goes.
// A size whose class does generate a font size is still offered.
tester.run(
  "no-arbitrary-typography — a font size sharing a colour's name",
  bindResolved(noArbitraryTypography, { designSystem }),
  {
    valid: [],
    invalid: [
      {
        code: '<div className="text-[12px]" />;',
        errors: [{ messageId: "arbitraryFontSize", suggestions: [] }],
      },
      {
        code: '<div className="text-[0.875rem]" />;',
        errors: [
          {
            messageId: "arbitraryFontSize",
            suggestions: [{ messageId: "useThemeValue", output: '<div className="text-sm" />;' }],
          },
        ],
      },
    ],
  },
);
