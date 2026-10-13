import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import { ruleFor } from "../harness/options.js";

/**
 * The message names what to change. The contract asserts message ids and spans, so the
 * wording — which property a hand-styled heading set, and every override at once — is here.
 */
RuleTester.describe = describe;
RuleTester.it = it;

const config = { eslintCompat: true, languageOptions: { parserOptions: { lang: "tsx" } } };

new RuleTester(config).run("no-ad-hoc-heading — messages", ruleFor("no-ad-hoc-heading"), {
  valid: [],
  invalid: [
    {
      name: "a hand-styled heading names the property its class set",
      code: '<h2 className="font-bold" />',
      errors: [
        {
          message:
            "font-bold on <h2> — a heading takes its font weight from a heading class, not from a class of its own",
        },
      ],
    },
    {
      name: "a class two branches both name is named once",
      code: '<div className={cn("heading-3", big ? "font-bold text-xl" : "font-bold")} />',
      errors: [
        {
          message:
            "font-bold, text-xl override heading-3 — use the heading class as it is, or a different heading class",
        },
      ],
    },
    {
      name: "an override names every overriding class in one report",
      code: '<div className="heading-1 text-4xl md:font-bold" />',
      errors: [
        {
          message:
            "text-4xl, md:font-bold override heading-1 — use the heading class as it is, or a different heading class",
        },
      ],
    },
  ],
});
