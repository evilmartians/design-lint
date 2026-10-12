import { describe, expect, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";

import { contracts } from "../contracts/index.js";
import { optionsFor, ruleFor } from "./options.js";

/**
 * Where a rule points.
 *
 * Every `caught` contract case asserts its message id and full span, but almost every case
 * is one line long, where a line assertion says little. The risk lives in code that spans
 * lines and reports more than once, so each rule also has a fixture here that a lazy rule
 * could not satisfy.
 *
 * The meta test at the bottom makes that an obligation: every rule with a contract must
 * have a fixture here, and the fixture must be one no line-1 rule could satisfy.
 */

/**
 * One entry per implemented rule. The code is deliberately not minimal: the first
 * violation is never on line 1, and there is more than one of them on more than one line,
 * so a rule that collapses its reports to the top of the file or to a single span fails.
 *
 * Columns are 1-based here — that is what `eslintCompat: true` buys, and without it they
 * would silently be 0-based.
 */
export const FIXTURES = {
  "no-arbitrary-typography": [
    {
      name: "each bracketed value, at the class, with a fix only where the theme has the value",
      code: [
        'const base = "p-2";',
        'const label = cva("text-sm", { variants: { size: {',
        '  tiny: "text-[11px] font-[600]",',
        "} } });",
        "<h2",
        '  className={cn("md:tracking-[0.025em]", base)}',
        "/>;",
      ].join("\n"),
      errors: [
        // Two classes in one string are two spans. `11px` is no value the theme names — and
        // `0.6875rem` would not be converted to it if it were — so there is no fix.
        { messageId: "arbitraryFontSize", line: 3, column: 10, endLine: 3, endColumn: 21, suggestions: [] },
        {
          messageId: "arbitraryFontWeight",
          line: 3,
          column: 22,
          endLine: 3,
          endColumn: 32,
          suggestions: [
            {
              messageId: "useThemeValue",
              output: [
                'const base = "p-2";',
                'const label = cva("text-sm", { variants: { size: {',
                '  tiny: "text-[11px] font-semibold",',
                "} } });",
                "<h2",
                '  className={cn("md:tracking-[0.025em]", base)}',
                "/>;",
              ].join("\n"),
            },
          ],
        },
        // The fix keeps the variant: only the bracketed value is replaced.
        {
          messageId: "arbitraryLetterSpacing",
          line: 6,
          column: 18,
          endLine: 6,
          endColumn: 39,
          suggestions: [
            {
              messageId: "useThemeValue",
              output: [
                'const base = "p-2";',
                'const label = cva("text-sm", { variants: { size: {',
                '  tiny: "text-[11px] font-[600]",',
                "} } });",
                "<h2",
                '  className={cn("md:tracking-wide", base)}',
                "/>;",
              ].join("\n"),
            },
          ],
        },
      ],
    },
  ],
  "no-arbitrary-radius": [
    {
      name: "each bracketed radius, at the class and not at the string that holds it",
      code: [
        'const radius = "p-2";',
        "<div",
        '  className="rounded-[0.5rem] p-2"',
        "/>;",
        'const corner = { top: "rounded-t-[7px]" };',
      ].join("\n"),
      errors: [
        {
          messageId: "arbitraryRadius",
          line: 3,
          column: 14,
          endLine: 3,
          endColumn: 30,
          suggestions: [
            {
              messageId: "useThemeValue",
              output: [
                'const radius = "p-2";',
                "<div",
                '  className="rounded-lg p-2"',
                "/>;",
                'const corner = { top: "rounded-t-[7px]" };',
              ].join("\n"),
            },
          ],
        },
        { messageId: "arbitraryRadius", line: 5, column: 24, endLine: 5, endColumn: 39, suggestions: [] },
      ],
    },
  ],
  "no-ad-hoc-heading": [
    {
      name: "one report per element, at its first offending class",
      code: [
        'const title = "Settings";',
        "<section>",
        "  <h2",
        "    className={cn(",
        '      "mb-2",',
        '      "font-bold",',
        '      "text-2xl",',
        "    )}",
        "  >",
        "    {title}",
        "  </h2>",
        '  <h3 className="heading-3 mt-4">{title}</h3>',
        '  <div className="heading-6 text-sm uppercase">{title}</div>',
        "</section>;",
      ].join("\n"),
      errors: [
        // Two classes of its own, one report, at the first of them.
        { messageId: "handStyledHeading", line: 6, column: 8, endLine: 6, endColumn: 17 },
        // Line 12 places a heading class, and is silent.
        { messageId: "headingClassOverride", line: 13, column: 29, endLine: 13, endColumn: 36 },
      ],
    },
  ],
  "no-opacity-modifier": [
    {
      name: "each offending class, at the class and not at the string that holds it",
      code: [
        'const overlay = cva("fixed inset-0", {',
        '  variants: { tone: { dim: "bg-black/50", dimmer: "bg-black/70" } },',
        "});",
        "<div",
        '  className={cn("rounded-md bg-primary/50 text-foreground/75", className)}',
        "/>;",
        '<svg><path className="fill-primary/50 stroke-primary/50" /></svg>;',
      ].join("\n"),
      errors: [
        { messageId: "opacityModifierOnColor", line: 2, column: 29, endLine: 2, endColumn: 40 },
        { messageId: "opacityModifierOnColor", line: 2, column: 52, endLine: 2, endColumn: 63 },
        { messageId: "opacityModifierOnColor", line: 5, column: 29, endLine: 5, endColumn: 42 },
        { messageId: "opacityModifierOnColor", line: 5, column: 43, endLine: 5, endColumn: 61 },
        { messageId: "opacityModifierOnColor", line: 7, column: 23, endLine: 7, endColumn: 38 },
        { messageId: "opacityModifierOnColor", line: 7, column: 39, endLine: 7, endColumn: 56 },
      ],
    },
  ],
  "token-constraints": [
    {
      name: "each offending class, at the class and not at the string that carries it",
      options: [
        {
          ...optionsFor("token-constraints")[0],
          allowed: {
            text: ["*foreground*", "primary", "link*"],
            border: ["border*", "input", "ring"],
            "hover:": ["*-hover"],
          },
          denied: { "*": ["*-foreground"] },
        },
      ],
      code: [
        'const base = "rounded-md p-2";',
        'const tone = { warn: "text-warning" };',
        '<div className="text-muted bg-muted-foreground" />;',
        "<div",
        '  className="hover:bg-primary"',
        "/>;",
      ].join("\n"),
      errors: [
        { messageId: "prefixNotAllowed", line: 2, column: 23, endLine: 2, endColumn: 35 },
        { messageId: "prefixNotAllowed", line: 3, column: 17, endLine: 3, endColumn: 27 },
        { messageId: "prefixDenied", line: 3, column: 28, endLine: 3, endColumn: 47 },
        { messageId: "variantNotAllowed", line: 5, column: 14, endLine: 5, endColumn: 30 },
      ],
    },
  ],
  "no-spectral-color": [
    {
      name: "each class where it was written, not the string that carries it",
      // A replacement is only named when the stylesheet defines it, and the fixture's
      // defines `danger-muted` rather than the default map's `danger`.
      options: [
        {
          ...optionsFor("no-spectral-color")[0],
          replacement: { bg: [{ "red-400...600": "danger-muted" }] },
        },
      ],
      code: [
        'const tone = "p-2";',
        "const badge = {",
        '  danger: "bg-red-500 text-white",',
        '  info: "hover:border-x-slate-200",',
        "};",
        "<div className={`text-${kind}`} />;",
      ].join("\n"),
      errors: [
        // Two classes in one string literal, and they are two spans. The rule that reported
        // the literal would put both of these at column 11 and be none the wiser.
        {
          messageId: "spectralColorWithReplacement",
          line: 3,
          column: 12,
          endLine: 3,
          endColumn: 22,
          // The span is also what the suggestion rewrites, so asserting it here is the only
          // place that promise becomes an assertion — the corpus checks counts, not fixes.
          suggestions: [
            {
              messageId: "useReplacement",
              output: [
                'const tone = "p-2";',
                "const badge = {",
                '  danger: "bg-danger-muted text-white",',
                '  info: "hover:border-x-slate-200",',
                "};",
                "<div className={`text-${kind}`} />;",
              ].join("\n"),
            },
          ],
        },
        { messageId: "spectralColor", line: 3, column: 23, endLine: 3, endColumn: 33 },
        // The variant is part of the class the author has to edit, so it is part of the span.
        { messageId: "spectralColor", line: 4, column: 10, endLine: 4, endColumn: 34 },
        // Line 6 is a class built by interpolation, which no rule checks.
      ],
    },
  ],
  "no-useless-hover": [
    {
      name: "the offending class, at the class and not at the element that carries it",
      code: [
        'const label = "Save";',
        '<div className="rounded-md hover:bg-primary" />;',
        '<button className="hover:bg-primary">',
        '  <span className="hover:underline">{label}</span>',
        "</button>;",
        '<li className={cn("p-2", "not-hover:text-muted")} />;',
        '<svg><path className="fill-primary [&:hover]:fill-link" /></svg>;',
        '<tr className="hover:bg-muted" />;',
      ].join("\n"),
      errors: [
        // The span is the class, not the string that holds it: `rounded-md` shares the
        // literal and is nobody's business here.
        { messageId: "hoverOnNonInteractive", line: 2, column: 28, endLine: 2, endColumn: 44 },
        // Lines 3-5 are the two silences that matter most, asserted by their absence: the
        // `<button>` is interactive by tag, and the `<span>` inside it is exempt because the
        // pointer is over the button too.
        { messageId: "hoverOnNonInteractive", line: 6, column: 27, endLine: 6, endColumn: 47 },
        // Through a `cn()` argument and in the arbitrary spelling, each still located in the
        // source text the author wrote rather than at the attribute.
        { messageId: "hoverOnNonInteractive", line: 7, column: 36, endLine: 7, endColumn: 55 },
        // Line 8 is silent too — `tr` is on the recommended `interactiveElements`.
      ],
    },
  ],
  "no-component-color-override": [
    {
      name: "each offending class, at the class and not at the attribute or the element",
      code: [
        'import { Button } from "@/components/ui/button";',
        'import { Card, CardHeader } from "@/components/ui/card";',
        "",
        '<Card className="rounded-lg border-primary bg-transparent">',
        "  <CardHeader className={cn(\"p-4\", `text-destructive ${extra}`)} />",
        '  <Button className="hover:bg-red-500/80" />',
        '  <div className="bg-primary" />',
        "</Card>;",
      ].join("\n"),
      errors: [
        // Two colour classes in one string, either side of a non-colour one: three spans
        // are available and the rule has to pick the right two.
        { messageId: "colorOnComponent", line: 4, column: 29, endLine: 4, endColumn: 43 },
        { messageId: "colorOnComponent", line: 4, column: 44, endLine: 4, endColumn: 58 },
        // A complete class inside a template with an interpolation, located inside the
        // template — not at the `cn()` call or the attribute wrapping it.
        { messageId: "colorOnComponent", line: 5, column: 37, endLine: 5, endColumn: 53 },
        // The variant and the opacity modifier are part of the class the author has to
        // edit, so they are part of the span.
        { messageId: "colorOnComponent", line: 6, column: 22, endLine: 6, endColumn: 41 },
        // Line 7 is the same colour class on a `<div>`, which no import binds. Nothing is
        // reported there, and a rule that watched names rather than bindings would.
      ],
    },
  ],
  "no-undefined-token": [
    {
      name: "each undefined class, at the class and not at the string that carries it",
      code: [
        'const base = cn("rounded-md p-2");',
        'const badge = cva("", { variants: { tone: {',
        '  danger: "bg-danger-muted text-secondary",',
        '  ok: "bg-success-muted",',
        "} } });",
        "<div",
        '  className={cn("p-2", "hover:text-warning-foreground")}',
        "/>;",
        '<div className="bg-primry" />;',
      ].join("\n"),
      errors: [
        // Two undefined classes in one string literal, and they are two spans. Line 1 and
        // line 4 are the silences either side of them: `rounded-md`, `p-2` and
        // `bg-success-muted` all generate CSS, and this rule's subject is only the ones
        // that do not.
        { messageId: "undefinedColorToken", line: 3, column: 12, endLine: 3, endColumn: 27 },
        { messageId: "undefinedColorToken", line: 3, column: 28, endLine: 3, endColumn: 42 },
        // The variant is part of the class the author has to edit, so it is part of the
        // span — and the report lands inside the `cn()` argument rather than at the
        // attribute or the element.
        { messageId: "undefinedColorToken", line: 7, column: 25, endLine: 7, endColumn: 54 },
        // A near miss reports under the other message id, whose text names the candidate:
        // suggestions do not render on the CLI, so a hint that lived only in the payload
        // below would reach nobody. The suggestion rewrites the class and nothing else,
        // which is a promise the corpus — counting reports — cannot make.
        {
          messageId: "undefinedColorTokenWithCandidate",
          line: 9,
          column: 17,
          endLine: 9,
          endColumn: 26,
          suggestions: [
            {
              messageId: "useCandidate",
              output: [
                'const base = cn("rounded-md p-2");',
                'const badge = cva("", { variants: { tone: {',
                '  danger: "bg-danger-muted text-secondary",',
                '  ok: "bg-success-muted",',
                "} } });",
                "<div",
                '  className={cn("p-2", "hover:text-warning-foreground")}',
                "/>;",
                '<div className="bg-primary" />;',
              ].join("\n"),
            },
          ],
        },
      ],
    },
  ],
  "no-raw-color": [
    {
      name: "each offending value, at the thing that carries it and not at the file",
      code: [
        'const tone = "p-2";',
        'const SERIES = ["#ff0000", "#00ff00"];',
        '<div className="bg-[#f00] text-[#0f0]" />;',
        "<svg>",
        '  <rect fill="#ff0000" stroke="currentColor" />',
        "</svg>;",
        "<div",
        '  style={{ boxShadow: "0 0 4px #f00, 0 0 8px #00f" }}',
        "/>;",
      ].join("\n"),
      errors: [
        // The backstop reports the string literal, so the span carries its quotes — there
        // is no smaller thing to point at, and two colours in one array are two of them.
        { messageId: "rawColorValue", line: 2, column: 17, endLine: 2, endColumn: 26 },
        { messageId: "rawColorValue", line: 2, column: 28, endLine: 2, endColumn: 37 },
        // The class surface reports the class, so the span does *not* carry the quotes: two
        // arbitrary values in one string literal are two spans, and a rule that reported
        // the literal would put both at column 16 and be none the wiser.
        { messageId: "rawColorValue", line: 3, column: 17, endLine: 3, endColumn: 26 },
        { messageId: "rawColorValue", line: 3, column: 27, endLine: 3, endColumn: 38 },
        // The attribute, name included — it is the text the author has to edit. The
        // `stroke` beside it is `currentColor`, a reference, and stays silent.
        { messageId: "rawColorValue", line: 5, column: 9, endLine: 5, endColumn: 23 },
        // One report per style property, however many literals the value holds: two hex
        // colours in one shadow are one value and one edit.
        { messageId: "rawColorValue", line: 8, column: 12, endLine: 8, endColumn: 51 },
      ],
    },
  ],
  "no-style-color": [
    {
      name: "each offending property, at the property and not at the prop or the element",
      code: [
        "const theme = getTheme();",
        "<div",
        "  style={{",
        '    fontWeight: "bold",',
        "    color: theme.accent,",
        "  }}",
        "/>;",
        "<svg>",
        '  <rect style={{ fill: "red", stroke: "blue" }} />',
        "</svg>;",
      ].join("\n"),
      errors: [
        { messageId: "colorInStyleProp", line: 5, column: 5, endLine: 5, endColumn: 24 },
        { messageId: "colorInStyleProp", line: 9, column: 18, endLine: 9, endColumn: 29 },
        { messageId: "colorInStyleProp", line: 9, column: 31, endLine: 9, endColumn: 45 },
      ],
    },
  ],
  "no-dark-variant": [
    {
      name: "each theme fork, at the class and not at the string or the element that carries it",
      code: [
        'const label = "Save";',
        'const panel = cva("rounded-md", {',
        '  variants: { tone: { night: "dark:bg-card dark:text-muted" } },',
        "});",
        '<div className={cn("p-2", "not-dark:border-border")} />;',
        '<div className="bg-[light-dark(#000,#fff)]" />;',
        "<div",
        "  className={`md:dark:bg-card ${extra}`}",
        "/>;",
      ].join("\n"),
      errors: [
        // Two forks in one `cva()` variant string, and they are two spans. A rule that
        // reported the literal would put both at column 30 and be none the wiser.
        { messageId: "darkVariant", line: 3, column: 31, endLine: 3, endColumn: 43 },
        { messageId: "darkVariant", line: 3, column: 44, endLine: 3, endColumn: 59 },
        // Through a `cn()` argument, and in the negated spelling the old regex missed: the
        // span is the whole class the author has to edit, variant included.
        { messageId: "darkVariant", line: 5, column: 28, endLine: 5, endColumn: 50 },
        // `light-dark()` is a different message with a different fix, located at the class
        // rather than at the call inside it — the call is not what gets deleted alone.
        { messageId: "lightDarkFunction", line: 6, column: 17, endLine: 6, endColumn: 43 },
        // A complete class inside a template with an interpolation, located inside the
        // template — not at the attribute or the element spanning lines 7-9.
        { messageId: "darkVariant", line: 8, column: 15, endLine: 8, endColumn: 30 },
      ],
    },
  ],
};

RuleTester.describe = describe;
RuleTester.it = it;

const config = {
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: "tsx" } },
};

for (const [ruleName, fixtures] of Object.entries(FIXTURES)) {
  new RuleTester(config).run(`${ruleName} — report locations`, ruleFor(ruleName), {
    valid: [],
    invalid: fixtures.map((f) => ({
      name: f.name,
      code: f.code,
      options: f.options ?? optionsFor(ruleName),
      errors: f.errors,
    })),
  });
}

describe("the location fixtures", () => {
  it("exists for every rule", () => {
    const missing = contracts
      .filter((c) => !FIXTURES[c.rule]?.length)
      .map((c) => c.rule);
    expect(missing).toEqual([]);
  });

  it.each(Object.entries(FIXTURES))("%s pins a span a lazy rule could not hit", (rule, fixtures) => {
    for (const fixture of fixtures) {
      const lines = fixture.errors.map((e) => e.line);

      // Every expectation is a full span, not a line: an endpoint is as easy to get wrong
      // as a start, and reporting a whole statement where a property was meant is the
      // mistake this file exists to catch.
      for (const error of fixture.errors) {
        expect(error).toMatchObject({
          messageId: expect.any(String),
          line: expect.any(Number),
          column: expect.any(Number),
          endLine: expect.any(Number),
          endColumn: expect.any(Number),
        });
      }

      // A rule that reports everything at the top of the file satisfies any fixture whose
      // violations start on line 1, and a rule that reports one span per file satisfies any
      // fixture that expects one line. Neither is allowed to be written here.
      expect(lines).not.toContain(1);
      expect(new Set(lines).size).toBeGreaterThan(1);
    }
  });
});
