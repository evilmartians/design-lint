/**
 * no-ad-hoc-heading — typography on headings comes from a heading class, and a heading class
 * is used as it is.
 *
 * Two checks, at most one report per element. A heading class is whatever `headingClasses`
 * matches — `heading-*` by default — and is not looked up in the theme, so these cases hold
 * whether or not the theme defines `heading-1`.
 */

// `custom` names a project's own heading vocabulary instead of the default.
const options = {
  custom: { headingClasses: ["title-*", "display"] },
};

export default {
  rule: "no-ad-hoc-heading",
  cases: [

    // A heading tag with no heading class, and a size or a weight of its own. Either one is
    // the violation; with both, one report at the first.
    {
      kind: "caught",
      group: "Hand-styled headings",
      code: `<h1 className="text-3xl" />`,
      reports: [{ id: "handStyledHeading", line: 1, column: 16, endLine: 1, endColumn: 24 }],
    },
    {
      kind: "caught",
      group: "Hand-styled headings",
      code: `<h4 className="font-semibold" />`,
      reports: [{ id: "handStyledHeading", line: 1, column: 16, endLine: 1, endColumn: 29 }],
    },
    {
      kind: "caught",
      group: "Hand-styled headings",
      code: `<h2 className="mb-2 font-bold text-xl" />`,
      reports: [{ id: "handStyledHeading", line: 1, column: 21, endLine: 1, endColumn: 30 }],
    },
    {
      kind: "caught",
      group: "Hand-styled headings",
      code: `<h3 className={cn("text-[32px]", isActive && "text-primary")} />`,
      reports: [{ id: "handStyledHeading", line: 1, column: 20, endLine: 1, endColumn: 31 }],
    },
    {
      kind: "caught",
      group: "Hand-styled headings",
      code: `<h5 className="md:text-lg" />`,
      reports: [{ id: "handStyledHeading", line: 1, column: 16, endLine: 1, endColumn: 26 }],
    },

    // A heading class with a class that changes its typography, on any element. Reported at
    // the first override; the message names them all.
    {
      kind: "caught",
      group: "Overridden heading classes",
      code: `<div className="heading-1 font-bold" />`,
      reports: [{ id: "headingClassOverride", line: 1, column: 27, endLine: 1, endColumn: 36 }],
    },
    {
      kind: "caught",
      group: "Overridden heading classes",
      code: `<h1 className="heading-1 text-4xl font-bold" />`,
      reports: [{ id: "headingClassOverride", line: 1, column: 26, endLine: 1, endColumn: 34 }],
    },
    {
      kind: "caught",
      group: "Overridden heading classes",
      code: `<span className="leading-tight heading-6" />`,
      reports: [{ id: "headingClassOverride", line: 1, column: 18, endLine: 1, endColumn: 31 }],
    },
    {
      kind: "caught",
      group: "Overridden heading classes",
      code: `<p className="heading-3 tracking-wide uppercase italic font-mono" />`,
      reports: [{ id: "headingClassOverride", line: 1, column: 25, endLine: 1, endColumn: 38 }],
    },
    // A variant does not make an override something else: a second size at a breakpoint is a
    // size the heading class did not choose. A different heading class at that breakpoint is
    // the fix.
    {
      kind: "caught",
      group: "Overridden heading classes",
      code: `<h2 className="heading-2 md:text-3xl" />`,
      reports: [{ id: "headingClassOverride", line: 1, column: 26, endLine: 1, endColumn: 37 }],
    },

    {
      kind: "allowed",
      group: "Heading classes",
      code: `<h1 className="heading-1" />`,
    },
    {
      kind: "allowed",
      group: "Heading classes",
      code: `<h2 className="heading-2 md:heading-1" />`,
    },
    // Placing and colouring a heading leave its typography as the class chose it.
    {
      kind: "allowed",
      group: "Heading classes",
      code: `<h3 className="heading-3 mt-4 mb-2 text-muted-foreground truncate" />`,
    },
    {
      kind: "allowed",
      group: "Heading classes",
      code: `<div className="heading-6 px-2" />`,
    },

    // A heading tag with classes that set neither size nor weight.
    {
      kind: "allowed",
      group: "Headings without typography of their own",
      code: `<h2 className="text-primary mb-4 truncate" />`,
    },
    {
      kind: "allowed",
      group: "Headings without typography of their own",
      code: `<h2 />`,
    },

    // Typography on an element that is not a heading and has no heading class is not this
    // rule's subject.
    {
      kind: "allowed",
      group: "Not a heading",
      code: `<p className="text-3xl font-bold" />`,
    },

    // The vocabulary is the project's. With its own globs, its own classes are heading
    // classes and `heading-1` is just another class.
    {
      kind: "caught",
      group: "A project's own heading classes",
      options: options.custom,
      code: `<div className="title-lg font-bold" />`,
      reports: [{ id: "headingClassOverride", line: 1, column: 26, endLine: 1, endColumn: 35 }],
    },
    {
      kind: "allowed",
      group: "A project's own heading classes",
      options: options.custom,
      code: `<h1 className="display" />`,
    },
    {
      kind: "allowed",
      group: "A project's own heading classes",
      options: options.custom,
      code: `<div className="heading-1 font-bold" />`,
    },

    // What a component renders is decided in another file, and a role is not a tag. A heading
    // class on a component is still a class on that element, so an override there is caught.
    {
      kind: "blindspot",
      group: "Headings the rule cannot see",
      code: `<Heading className="text-3xl font-bold" />`,
    },
    {
      kind: "blindspot",
      group: "Headings the rule cannot see",
      code: `<div role="heading" aria-level={1} className="text-3xl font-bold" />`,
    },
    {
      kind: "blindspot",
      group: "Headings the rule cannot see",
      code: `<h1 className={titleStyles} />`,
    },
    {
      kind: "caught",
      group: "Headings the rule cannot see",
      code: `<CardTitle className="heading-4 font-bold" />`,
      reports: [{ id: "headingClassOverride", line: 1, column: 33, endLine: 1, endColumn: 42 }],
    },
    // Every branch of a `className` is read as one class list, so a heading class and a
    // typography class in opposite branches — which never reach the element together — still
    // report. The accepted false positive, answered by `oxlint-disable-next-line`.
    {
      kind: "caught",
      group: "Headings the rule cannot see",
      code: `<div className={cn(big ? "heading-1" : "text-sm")} />`,
      reports: [{ id: "headingClassOverride", line: 1, column: 41, endLine: 1, endColumn: 48 }],
    },
  ],
};
