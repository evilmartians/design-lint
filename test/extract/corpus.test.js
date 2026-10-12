import { describe, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";

import { classSourcesOfElement, sweepVisitors } from "../../src/extract/index.js";
import { classTokens } from "../../src/policy/tokenize.js";
import { contracts, runnable, sourceOf } from "../contracts/index.js";

/**
 * The extraction-shaped subset of the contracts in `test/contracts/`.
 *
 * `test/extract/sweep.test.js` and `element.test.js` assert exactly which tokens come out
 * of a given shape. This file asserts something coarser and more important: that for every
 * case a rule *promises to catch*, extraction puts at least one class token in front of it.
 * A rule cannot report what it never sees, so a promise whose string never arrives is a hole
 * in the extractor rather than in the rule — and this is where that shows up, before the
 * rule is blamed for it.
 *
 * Two rules are outside it, and not because they are hard. `no-style-color` reads a `style`
 * object, and `no-raw-color` reads values — SVG attributes, style values, string constants —
 * so neither promise is made of class strings. Asserting class extraction over their cases
 * would assert nothing about either.
 */

const SWEEP_RULES = new Set([
  "no-arbitrary-radius",
  "no-arbitrary-typography",
  "no-spectral-color",
  "no-opacity-modifier",
  "no-dark-variant",
  "no-undefined-token",
  "token-constraints",
]);

const ELEMENT_RULES = new Set(["no-ad-hoc-heading", "no-component-color-override", "no-useless-hover"]);

const meta = {
  type: "problem",
  schema: [{ type: "object", additionalProperties: true }],
  messages: { none: "extraction found no class token" },
};

/** Reports once, on a file from which the sweep recovers nothing. */
const sweepReach = {
  meta,
  create(context) {
    let found = 0;
    const visitors = sweepVisitors((source) => {
      found += classTokens(source).length;
    });
    return {
      ...visitors,
      "Program:exit"(node) {
        if (found === 0) context.report({ node, messageId: "none" });
      },
    };
  },
};

/** Reports once, on a file where no element's `className` resolves to anything. */
const elementReach = {
  meta,
  create(context) {
    let found = 0;
    return {
      JSXOpeningElement(node) {
        for (const source of classSourcesOfElement(node)) found += classTokens(source).length;
      },
      "Program:exit"(node) {
        if (found === 0) context.report({ node, messageId: "none" });
      },
    };
  },
};

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: "tsx" } },
});

for (const contract of contracts) {
  const probe = SWEEP_RULES.has(contract.rule)
    ? sweepReach
    : ELEMENT_RULES.has(contract.rule)
      ? elementReach
      : null;
  if (!probe) continue;

  // Extraction does not read options, so two cases that differ only in the policy they
  // assume are one case here — and `RuleTester` rejects the repeat outright.
  const byCode = new Map();
  for (const c of runnable(contract).filter((c) => c.kind === "caught")) {
    const code = sourceOf(contract, c);
    if (!byCode.has(code)) byCode.set(code, `${c.group} — ${c.code.trim().split("\n")[0]}`);
  }

  tester.run(`${contract.rule} — every promise reaches extraction`, probe, {
    valid: [...byCode].map(([code, name]) => ({ name, code })),
    invalid: [],
  });
}
