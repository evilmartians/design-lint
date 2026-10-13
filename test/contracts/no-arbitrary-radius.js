/**
 * no-arbitrary-radius — corner radii come from the theme's scale, not from a value written
 * in brackets.
 *
 * A class is reported when its value is in brackets and it sets `border-radius` or any of
 * its corner and side forms.
 */
export default {
  rule: "no-arbitrary-radius",
  cases: [

    {
      kind: "caught",
      group: "Every corner",
      code: `<div className="rounded-[6px]" />`,
      reports: [{ id: "arbitraryRadius", line: 1, column: 17, endLine: 1, endColumn: 30 }],
    },
    {
      kind: "caught",
      group: "Every corner",
      code: `<div className="rounded-tl-[4px]" />`,
      reports: [{ id: "arbitraryRadius", line: 1, column: 17, endLine: 1, endColumn: 33 }],
    },
    {
      kind: "caught",
      group: "Every corner",
      code: `<div className="rounded-s-[3px]" />`,
      reports: [{ id: "arbitraryRadius", line: 1, column: 17, endLine: 1, endColumn: 32 }],
    },
    {
      kind: "caught",
      group: "Every corner",
      code: `<div className="hover:rounded-[6px]" />`,
      reports: [{ id: "arbitraryRadius", line: 1, column: 17, endLine: 1, endColumn: 36 }],
    },

    // Arithmetic on literals is still a literal.
    {
      kind: "caught",
      group: "Computed from literals",
      code: `<div className="rounded-[calc(0.5rem-2px)]" />`,
      reports: [{ id: "arbitraryRadius", line: 1, column: 17, endLine: 1, endColumn: 43 }],
    },

    {
      kind: "caught",
      group: "Arbitrary properties",
      code: `<div className="[border-radius:6px]" />`,
      reports: [{ id: "arbitraryRadius", line: 1, column: 17, endLine: 1, endColumn: 36 }],
    },

    {
      kind: "allowed",
      group: "Theme values",
      code: `<div className="rounded-lg rounded-t-md rounded-full rounded-none" />`,
    },

    // A radius derived from a token stays tied to it — the nested-corner idiom
    // `calc(var(--radius) - 2px)` is the common case. `inherit` takes the parent's.
    {
      kind: "allowed",
      group: "References and keywords",
      code: `<div className="rounded-[calc(var(--radius)-2px)]" />`,
    },
    {
      kind: "allowed",
      group: "References and keywords",
      code: `<div className="rounded-(--radius-card)" />`,
    },
    {
      kind: "allowed",
      group: "References and keywords",
      code: `<div className="rounded-[inherit]" />`,
    },

    {
      kind: "blindspot",
      group: "Not a class",
      code: `<div style={{ borderRadius: 6 }} />`,
    },
    {
      kind: "blindspot",
      group: "Not a class",
      code: "<div className={`rounded-[${radius}px]`} />",
    },

    {
      kind: "deferred",
      lang: "css",
      group: "@apply",
      code: `.card { @apply rounded-[6px]; }`,
    },
  ],
};
