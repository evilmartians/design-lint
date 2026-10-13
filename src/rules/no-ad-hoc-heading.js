import { classSourcesOfElement } from "../extract/index.js";
import { globToRegExp, IGNORE_GLOBS_SCHEMA, ignoredFile, STORY_GLOBS } from "../policy/ignore.js";
import { classTokens } from "../policy/tokenize.js";
import { parseClass } from "../policy/variants.js";

/**
 * no-ad-hoc-heading — typography on headings comes from a heading class, and a heading class
 * is used as it is.
 *
 * The specification is `test/contracts/no-ad-hoc-heading.js`; `docs/rules/no-ad-hoc-heading.md`
 * is the guide for the people using it.
 *
 * ## Two checks, one per element
 *
 * - **A hand-styled heading.** An `<h1>`–`<h6>` with no heading class whose classes set a font
 *   size or a font weight. Either one alone is the violation.
 * - **An overridden heading class.** Any element with a heading class and another class that
 *   changes its typography: `<div className="heading-1 font-bold">`. Variants count —
 *   `heading-2 md:text-3xl` is a second size the heading class did not choose.
 *
 * An element with a heading class is only ever judged by the second check, so each element
 * gets at most one report.
 *
 * ## What a heading class is
 *
 * The `headingClasses` option — globs over the class with its variants taken off, `heading-*`
 * by default. It is not looked up in the theme: which classes are headings is the project's
 * vocabulary, written down, not something this rule infers.
 *
 * ## What it does not see
 *
 * Heading components, `role="heading"`, and class lists passed in a variable. Only lowercase
 * heading tags are judged by the first check, because a component's element is decided in
 * another file.
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Headings take their typography from a heading class, used as it is.",
    },
    messages: {
      handStyledHeading:
        "{{className}} on <{{tag}}> — a heading takes its {{property}} from a heading class, not from a class of its own",
      headingClassOverride:
        "{{overrides}} {{verb}} {{headingClass}} — use the heading class as it is, or a different heading class",
    },
    schema: [
      {
        type: "object",
        properties: {
          headingClasses: { type: "array", items: { type: "string" } },
          ignoreGlobs: IGNORE_GLOBS_SCHEMA,
        },
        additionalProperties: false,
      },
    ],
    // Both options are lists, which Oxlint's deep `defaultOptions` merge replaces whole, so the
    // defaults are safe here. They are repeated in `create` because `RuleTester` does not apply
    // `defaultOptions`.
    defaultOptions: [{ headingClasses: ["heading-*"], ignoreGlobs: [...STORY_GLOBS] }],
  },

  create(context) {
    const {
      designSystem,
      headingClasses = ["heading-*"],
      ignoreGlobs = STORY_GLOBS,
    } = context.options[0] ?? {};

    if (typeof designSystem?.declarations !== "function") {
      throw new Error(
        "no-ad-hoc-heading: `designSystem` is missing — `designLint()` resolves it from its `tokenFiles` and the plugin module binds it around `create`; it cannot be passed as a JSON option.",
      );
    }
    if (!Array.isArray(headingClasses)) {
      throw new Error("no-ad-hoc-heading: `headingClasses` must be a list of globs, such as [\"heading-*\"].");
    }

    if (ignoredFile(context.filename, ignoreGlobs)) return {};

    const patterns = headingClasses.map((glob) => globToRegExp(glob));
    const isHeadingClass = (base) => patterns.some((pattern) => pattern.test(base));

    return {
      JSXOpeningElement(node) {
        const classes = classesOf(node, designSystem, isHeadingClass);
        if (classes.length === 0) return;

        const heading = classes.find((c) => c.heading);
        if (heading) {
          const overrides = classes.filter((c) => !c.heading && c.typography);
          if (overrides.length === 0) return;
          // Branches of one `cn()` can name the same class twice; the message names it once.
          const names = [...new Set(overrides.map((c) => c.text))];
          context.report({
            ...locationOf(context, overrides[0]),
            messageId: "headingClassOverride",
            data: {
              overrides: names.join(", "),
              verb: names.length === 1 ? "overrides" : "override",
              headingClass: heading.text,
            },
          });
          return;
        }

        const tag = node.name?.type === "JSXIdentifier" ? node.name.name : null;
        if (!tag || !HEADING_TAG.test(tag)) return;

        const own = classes.find((c) => c.sizeOrWeight);
        if (!own) return;
        context.report({
          ...locationOf(context, own),
          messageId: "handStyledHeading",
          data: { className: own.text, tag, property: own.sizeOrWeight },
        });
      },
    };
  },
};

const HEADING_TAG = /^h[1-6]$/;

/**
 * The properties that make up a heading class's typography. A class setting any of them next
 * to a heading class changes how the heading reads. Spacing and colour are not among them:
 * placing a heading, or colouring it, leaves its typography as the class chose it.
 */
const TYPOGRAPHY = new Set([
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-transform",
  "font-family",
  "font-style",
]);

/**
 * Every static class on an element, with what this rule needs to know about each.
 *
 * @returns {{ text: string, token: object, node: object, heading: boolean, typography: boolean, sizeOrWeight: string | null }[]}
 */
function classesOf(opening, designSystem, isHeadingClass) {
  const classes = [];
  for (const source of classSourcesOfElement(opening)) {
    for (const token of classTokens(source)) {
      // A class with an interpolation in it is never judged: nothing says what it becomes.
      if (token.dynamic) continue;
      const { base } = parseClass(token.text);
      if (!base) continue;

      const heading = isHeadingClass(base);
      const properties = heading
        ? new Set()
        : new Set((designSystem.declarations(base) ?? []).map((d) => d.property));
      classes.push({
        text: token.text,
        token,
        node: source.node,
        heading,
        typography: [...properties].some((p) => TYPOGRAPHY.has(p)),
        sizeOrWeight: properties.has("font-size")
          ? "font size"
          : properties.has("font-weight")
            ? "font weight"
            : null,
      });
    }
  }
  return classes;
}

/** Report at the class where it could be located, at its string otherwise. */
function locationOf(context, { token, node }) {
  if (!token.range) return { node };
  const [start, end] = token.range;
  return {
    loc: {
      start: context.sourceCode.getLocFromIndex(start),
      end: context.sourceCode.getLocFromIndex(end),
    },
  };
}
