/**
 * no-arbitrary-typography — font size, font weight and letter spacing come from the theme's
 * scale, not from a value written in brackets.
 *
 * A class is reported when its value is in brackets and one of the properties it generates
 * is `font-size`, `font-weight` or `letter-spacing`. The property, not the prefix, is the
 * gate: `text-` also takes a colour and `font-` a family, and neither is this rule's.
 */
export default {
  rule: "no-arbitrary-typography",
  cases: [

    // Each of the three properties, and the type-hinted spelling of each.
    {
      kind: "caught",
      group: "Font size",
      code: `<div className="text-[13px]" />`,
      reports: [{ id: "arbitraryFontSize", line: 1, column: 17, endLine: 1, endColumn: 28 }],
    },
    {
      kind: "caught",
      group: "Font size",
      code: `<div className="text-[length:0.8rem]" />`,
      reports: [{ id: "arbitraryFontSize", line: 1, column: 17, endLine: 1, endColumn: 37 }],
    },
    {
      kind: "caught",
      group: "Font size",
      code: `<div className="text-[calc(1rem+2px)]" />`,
      reports: [{ id: "arbitraryFontSize", line: 1, column: 17, endLine: 1, endColumn: 38 }],
    },
    {
      kind: "caught",
      group: "Font weight",
      code: `<div className="font-[500]" />`,
      reports: [{ id: "arbitraryFontWeight", line: 1, column: 17, endLine: 1, endColumn: 27 }],
    },
    {
      kind: "caught",
      group: "Font weight",
      code: `<div className="font-[weight:500]" />`,
      reports: [{ id: "arbitraryFontWeight", line: 1, column: 17, endLine: 1, endColumn: 34 }],
    },
    {
      kind: "caught",
      group: "Letter spacing",
      code: `<div className="tracking-[0.02em]" />`,
      reports: [{ id: "arbitraryLetterSpacing", line: 1, column: 17, endLine: 1, endColumn: 34 }],
    },

    // The decorations around the value are part of the class the author edits, so they are
    // part of the span. A line-height modifier does not hide the size in front of it.
    {
      kind: "caught",
      group: "With variants and modifiers",
      code: `<div className="md:hover:text-[13px]" />`,
      reports: [{ id: "arbitraryFontSize", line: 1, column: 17, endLine: 1, endColumn: 37 }],
    },
    {
      kind: "caught",
      group: "With variants and modifiers",
      code: `<div className="text-[13px]/6" />`,
      reports: [{ id: "arbitraryFontSize", line: 1, column: 17, endLine: 1, endColumn: 30 }],
    },

    // An arbitrary property is the same hand-picked value with the utility left off. Leaving
    // it out would make the rule a matter of spelling.
    {
      kind: "caught",
      group: "Arbitrary properties",
      code: `<div className="[font-size:13px]" />`,
      reports: [{ id: "arbitraryFontSize", line: 1, column: 17, endLine: 1, endColumn: 33 }],
    },
    {
      kind: "caught",
      group: "Arbitrary properties",
      code: `<div className="[letter-spacing:0.02em]" />`,
      reports: [{ id: "arbitraryLetterSpacing", line: 1, column: 17, endLine: 1, endColumn: 40 }],
    },

    // Every string in the file, not only `className`: a `cn()` argument and a constants map
    // are where class strings are most often written. One string, two classes, two reports.
    {
      kind: "caught",
      group: "Anywhere a class string is written",
      code: `const c = cn("p-2", isLarge && "text-[13px]");`,
      reports: [{ id: "arbitraryFontSize", line: 1, column: 33, endLine: 1, endColumn: 44 }],
    },
    {
      kind: "caught",
      group: "Anywhere a class string is written",
      code: `<h1 className="font-[600] tracking-[-0.01em]" />`,
      reports: [
        { id: "arbitraryFontWeight", line: 1, column: 16, endLine: 1, endColumn: 26 },
        { id: "arbitraryLetterSpacing", line: 1, column: 27, endLine: 1, endColumn: 45 },
      ],
    },

    // The scale itself.
    {
      kind: "allowed",
      group: "Theme values",
      code: `<div className="text-sm font-semibold tracking-tight" />`,
    },

    // A value that reads a custom property is a reference to a decision made elsewhere, as
    // `no-raw-color` treats `var()`. A CSS-wide keyword picks no value at all.
    {
      kind: "allowed",
      group: "References and keywords",
      code: `<div className="text-(length:--hero-size)" />`,
    },
    {
      kind: "allowed",
      group: "References and keywords",
      code: `<div className="font-(--weight) tracking-[var(--tracking-label)]" />`,
    },
    {
      kind: "allowed",
      group: "References and keywords",
      code: `<div className="tracking-[inherit]" />`,
    },

    // Same prefix, other property: a colour, a line height, a family. Each is either another
    // rule's subject or nobody's.
    {
      kind: "allowed",
      group: "Other properties under the same prefix",
      code: `<div className="text-[#f00]" />`,
    },
    {
      kind: "allowed",
      group: "Other properties under the same prefix",
      code: `<div className="text-sm/[20px] leading-[1.2]" />`,
    },
    {
      kind: "allowed",
      group: "Other properties under the same prefix",
      code: `<div className="font-[Inter]" />`,
    },
    {
      kind: "allowed",
      group: "Other properties under the same prefix",
      code: `<div className="[--size:13px]" />`,
    },

    // The `style` prop sets the same properties, but it is not a class string.
    {
      kind: "blindspot",
      group: "Not a class",
      code: `<div style={{ fontSize: 13, fontWeight: 500 }} />`,
    },
    // An interpolation inside a class leaves nothing to judge.
    {
      kind: "blindspot",
      group: "Not a class",
      code: "<div className={`text-[${size}px]`} />",
    },

    {
      kind: "deferred",
      lang: "css",
      group: "@apply",
      code: `.label { @apply text-[13px]; }`,
    },
  ],
};
