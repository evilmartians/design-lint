import { sweepVisitors } from "../extract/index.js";
import { IGNORE_GLOBS_SCHEMA, ignoredFile, STORY_GLOBS } from "../policy/ignore.js";
import { classTokens } from "../policy/tokenize.js";
import { parseClass } from "../policy/variants.js";

/**
 * The machinery `no-arbitrary-typography` and `no-arbitrary-radius` share: a value written in
 * brackets where the theme has a scale. Each rule is this plus the CSS properties it watches
 * and the words it reports in.
 *
 * ## What counts
 *
 * The class's value is in brackets — `text-[13px]`, or the arbitrary property
 * `[font-size:13px]` — and one of the CSS properties it generates is watched. Asking Tailwind
 * for the property rather than matching the prefix is what keeps `text-[#f00]` (a colour,
 * `no-raw-color`'s) and `text-sm/[20px]` (a line height) out without a list of exceptions.
 *
 * ## What does not
 *
 * A value that reads a custom property — `rounded-[var(--radius-card)]`, `text-(--hero)`,
 * `calc(var(--radius) - 2px)` — is a reference, not a hand-picked number, exactly as
 * `no-raw-color` treats `var()`. CSS-wide keywords such as `inherit` pick no value at all.
 *
 * ## The suggestion
 *
 * Offered only when the bracketed value is, character for character, a value the theme
 * already names: `font-[600]` → `font-semibold`. No unit is converted and nothing is rounded;
 * anything else is reported with no fix.
 *
 * @param {{
 *   name: string,
 *   description: string,
 *   watch: (property: string) => { messageId: string, namespace: string } | null,
 *   messages: Record<string, string>,
 * }} spec
 */
export function arbitraryValueRule({ name, description, watch, messages }) {
  return {
    meta: {
      type: "problem",
      hasSuggestions: true,
      docs: { description },
      messages: {
        ...messages,
        useThemeValue: "Replace {{className}} with {{replacement}}",
      },
      schema: [
        {
          type: "object",
          properties: { ignoreGlobs: IGNORE_GLOBS_SCHEMA },
          additionalProperties: false,
        },
      ],
      defaultOptions: [{ ignoreGlobs: [...STORY_GLOBS] }],
    },

    create(context) {
      const { designSystem, ignoreGlobs = STORY_GLOBS } = context.options[0] ?? {};

      // The design system is the load step's output, never a consumer's typing. Missing, the
      // rule would report nothing and look like a clean codebase, so it says so instead.
      if (typeof designSystem?.arbitraryDeclarations !== "function") {
        throw new Error(
          `${name}: \`designSystem\` is missing — \`designLint()\` resolves it from its \`tokenFiles\` and the plugin module binds it around \`create\`; it cannot be passed as a JSON option.`,
        );
      }

      if (ignoredFile(context.filename, ignoreGlobs)) return {};

      return sweepVisitors((source) => {
        for (const token of classTokens(source)) {
          if (token.dynamic) continue;

          const found = arbitraryValueIn(token.text, designSystem, watch);
          if (!found) continue;

          const at = token.range ? { loc: spanOf(context, token.range) } : { node: source.node };
          const replacement = found.themeName && found.root ? `${found.root}-${found.themeName}` : null;

          context.report({
            ...at,
            messageId: found.messageId,
            data: { className: token.text, value: found.value },
            suggest:
              replacement && token.range
                ? [
                    {
                      messageId: "useThemeValue",
                      data: { className: token.text, replacement },
                      fix: (fixer) => {
                        const at = token.text.lastIndexOf(found.base);
                        const text =
                          token.text.slice(0, at) + replacement + token.text.slice(at + found.base.length);
                        return fixer.replaceTextRange(token.range, text);
                      },
                    },
                  ]
                : undefined,
          });
        }
      });
    },
  };
}

/** Keywords every CSS property accepts. They choose no value, so there is no scale to miss. */
const CSS_WIDE_KEYWORDS = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);

/**
 * The watched arbitrary value in a class, or `null`.
 *
 * @returns {{ base: string, root: string | null, value: string, messageId: string, themeName: string | null } | null}
 */
function arbitraryValueIn(className, designSystem, watch) {
  const { base } = parseClass(className);
  if (!base?.includes("[") && !base?.includes("(")) return null;

  const declarations = designSystem.arbitraryDeclarations(base);
  if (!declarations) return null;

  for (const declaration of declarations) {
    const watched = watch(declaration.property);
    if (!watched) continue;

    const value = declaration.value.trim();
    if (value.includes("var(") || CSS_WIDE_KEYWORDS.has(value)) return null;

    // A suggestion needs a utility to name, and an arbitrary property has none: which of
    // `rounded-tl` or `rounded-s` replaces `[border-top-left-radius:4px]` is not ours to pick.
    const root = base.startsWith("[") ? null : designSystem.parseRoot(base);
    return {
      base,
      root,
      value,
      messageId: watched.messageId,
      themeName: root ? designSystem.themeNameOf(watched.namespace, value) : null,
    };
  }
  return null;
}

/** A source range as the report API wants it. */
function spanOf(context, [start, end]) {
  return {
    start: context.sourceCode.getLocFromIndex(start),
    end: context.sourceCode.getLocFromIndex(end),
  };
}
