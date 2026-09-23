/**
 * no-raw-color — a colour is never written as a literal; every applied colour resolves
 * through a `var(--color-*)` token. Bias: false positives.
 *
 * Two models, each covering the other's hole. Context-scoped: a colour attribute, a
 * colour-carrying `style` property or a colour utility's bracket must hold a token — the only
 * places a bare `red` can safely be read as a colour. Value-scoped backstop: a string that is
 * *entirely* a hex or colour-function literal is caught wherever a value is written down.
 * One report per offending thing: class token, attribute, style property, literal.
 */
export default {
  rule: "no-raw-color",
  cases: [

    // Tailwind arbitrary values. A bracket is a delimited context with a known grammar, so
    // every literal form reads here — hex, colour functions, named and system colours, and a
    // literal inside a shadow, `color-mix()` or `light-dark()`.
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="bg-[#ff0000]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 29 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="text-[#f00]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="border-[#ff000080]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="ring-[rgb(255,0,0)]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="bg-[rgba(255,0,0,0.5)]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="text-[hsl(0,100%,50%)]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="text-[oklch(0.7_0.15_30)]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="text-[lab(50_40_-20)]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="text-[hwb(0_0%_0%)]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="text-[red]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="bg-[ButtonText]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="shadow-[0_0_4px_#f00]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="bg-[color-mix(in_oklch,#fff_50%,#000)]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 55 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="bg-[light-dark(#fff,#000)]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 43 },
      ],
    },
    // A type hint in the bracket, and an arbitrary property naming a colour property, are
    // the same literal in a different spelling.
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="text-[color:#f00]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="bg-[color:red]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="[color:#f00]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 29 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="hover:[background-color:red]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 45 },
      ],
    },
    // An arbitrary property is judged by the property it names; one that carries no colour
    // is left alone.
    {
      kind: "allowed",
      group: "Tailwind arbitrary values",
      code: `<div className="[mask-type:luminance]" />`,
    },
    {
      kind: "allowed",
      group: "Tailwind arbitrary values",
      code: `<div className="[grid-area:1/1]" />`,
    },
    // Variants do not change the answer, and the span includes them: the variant is part of
    // the class the author edits.
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="hover:bg-[#ff0000]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="md:dark:text-[#f00]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="[&>svg]:fill-[#f00]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 36 },
      ],
    },
    // Every offending token in one class string is its own report.
    {
      kind: "caught",
      group: "Tailwind arbitrary values",
      code: `<div className="bg-[#ff0000] text-[#00ff00]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 29 },
        { id: "rawColorValue", line: 1, column: 30, endLine: 1, endColumn: 44 },
      ],
    },

    // Class strings wherever they are built. Every string literal and the static text of
    // every template literal is read, whatever surrounds it, so `cn()` / `clsx()` /
    // `twMerge()` arguments, `cva()` / `tv()` maps, joined arrays, spread props and `.ts`
    // object-literal maps are covered without the rule knowing any of those helpers. Reading
    // `#ff0000` out of `bg-[#ff0000]` there does not reopen the embedded-literal blind spot:
    // the bracket is still a delimited context.
    {
      kind: "caught",
      group: "Class strings wherever they are built",
      code: `<div className={cn("bg-[#ff0000]", className)} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 21, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings wherever they are built",
      code: `<div className={clsx(isActive && "text-[#f00]")} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 35, endLine: 1, endColumn: 46 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings wherever they are built",
      code: `<div className={twMerge("bg-[#f00]", "p-2")} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 26, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings wherever they are built",
      code: `const button = cva("rounded", {
  variants: { tone: { danger: "bg-[#ff0000]" } },
});`,
      reports: [
        { id: "rawColorValue", line: 2, column: 32, endLine: 2, endColumn: 44 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings wherever they are built",
      code: `const badgeColor = { danger: "bg-[#ff0000]", ok: "bg-primary" };`,
      reports: [
        { id: "rawColorValue", line: 1, column: 31, endLine: 1, endColumn: 43 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings wherever they are built",
      code: `<div className={\`bg-[#ff0000]\`} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 18, endLine: 1, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings wherever they are built",
      code: `<div className={twMerge("p-2", "bg-[#ff0000]")} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 33, endLine: 1, endColumn: 45 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings wherever they are built",
      code: `<div className={tv({ base: "bg-[#ff0000]" })} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 29, endLine: 1, endColumn: 41 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings wherever they are built",
      code: `const joined = ["bg-[#ff0000]", "p-2"].join(" ");`,
      reports: [
        { id: "rawColorValue", line: 1, column: 18, endLine: 1, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings wherever they are built",
      code: `const spreadProps = { className: "bg-[#ff0000]" };
<div {...spreadProps} />;`,
      reports: [
        { id: "rawColorValue", line: 1, column: 35, endLine: 1, endColumn: 47 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings wherever they are built",
      code: `<div
  className="bg-[#ff0000]"
/>`,
      reports: [
        { id: "rawColorValue", line: 2, column: 14, endLine: 2, endColumn: 26 },
      ],
    },

    // Color attributes. The attribute's name decides, not the element: any JSX attribute
    // named `color`, `fill` or `stroke`, or ending in `Color` / `-color`, on any element or
    // component — an SVG shape, a chart's `color` prop, a `data-color`. An icon whose `fill`
    // was never revisited is one of the commonest leaks, and invisible to anything that only
    // reads class strings. One report per attribute, spanning the attribute; a conditional
    // writes two values, so each branch is its own report.
    {
      kind: "caught",
      group: "Color attributes",
      code: `<svg><rect fill="#ff0000" stroke="#00ff00" /></svg>`,
      reports: [
        { id: "rawColorValue", line: 1, column: 12, endLine: 1, endColumn: 26 },
        { id: "rawColorValue", line: 1, column: 27, endLine: 1, endColumn: 43 },
      ],
    },
    {
      kind: "caught",
      group: "Color attributes",
      code: `<circle fill="#ff0000" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 9, endLine: 1, endColumn: 23 },
      ],
    },
    {
      kind: "caught",
      group: "Color attributes",
      code: `<svg><path stroke="rgb(0,255,0)" /></svg>`,
      reports: [
        { id: "rawColorValue", line: 1, column: 12, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Color attributes",
      code: `<svg><stop stopColor="#ff0000" /></svg>`,
      reports: [
        { id: "rawColorValue", line: 1, column: 12, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Color attributes",
      code: `<svg><stop stop-color="red" /></svg>`,
      reports: [
        { id: "rawColorValue", line: 1, column: 12, endLine: 1, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Color attributes",
      code: `<svg><feFlood floodColor="#f00" /></svg>`,
      reports: [
        { id: "rawColorValue", line: 1, column: 15, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "Color attributes",
      code: `<path fill="rebeccapurple" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 7, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "Color attributes",
      code: `<Badge color="red" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 8, endLine: 1, endColumn: 19 },
      ],
    },
    {
      kind: "caught",
      group: "Color attributes",
      code: `<Button textColor="#f00" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 9, endLine: 1, endColumn: 25 },
      ],
    },
    {
      kind: "caught",
      group: "Color attributes",
      code: `<div data-color="#ff0000" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 6, endLine: 1, endColumn: 26 },
      ],
    },
    {
      kind: "caught",
      group: "Color attributes",
      code: `<rect fill={active ? "#ff0000" : "#00ff00"} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 22, endLine: 1, endColumn: 31 },
        { id: "rawColorValue", line: 1, column: 34, endLine: 1, endColumn: 43 },
      ],
    },

    // Style prop values. Shared deliberately with `no-style-color`, which owns the mechanism
    // while this rule owns the value: `style={{ color: "#f00" }}` reports under both. One
    // report per property, however many literals its value holds.
    {
      kind: "caught",
      group: "Style prop values",
      code: `<div style={{ backgroundColor: "#f00" }} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 15, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "Style prop values",
      code: `<div style={{ color: "rgb(255, 0, 0)" }} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 15, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "Style prop values",
      code: `<div style={{ color: "red" }} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 15, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "Style prop values",
      code: `<div style={{ boxShadow: "0 0 4px #f00" }} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 15, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Style prop values",
      code: `<div style={{ background: "linear-gradient(#fff, #000)" }} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 15, endLine: 1, endColumn: 56 },
      ],
    },
    // A custom property's name says nothing about colour, but the value is a colour written
    // down in application code. `"--color-brand": userColor` passes a value through instead,
    // and is allowed under Token references.
    {
      kind: "caught",
      group: "Style prop values",
      code: `<div style={{ "--brand": "#ff0000" }} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 26, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Style prop values",
      code: `<div style={{ color: active ? "red" : "blue" }} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 31, endLine: 1, endColumn: 36 },
        { id: "rawColorValue", line: 1, column: 39, endLine: 1, endColumn: 45 },
      ],
    },

    // String constants — the value-scoped backstop. A raw colour in a constant is a violation
    // whichever consumer eventually applies it. It is caught wherever a value is written
    // down: a declaration, a property, an array element (one report each), a returned or
    // assigned value, a default, and either side of a conditional or `??` / `||`. The
    // residual false positive — an id that happens to be hex-only, `"#face"` — is accepted
    // as suppressible noise; function arguments are left out for the same reason (see
    // Non-CSS color channels).
    {
      kind: "caught",
      group: "String constants",
      code: `const CHART_SERIES = "#ff0000";`,
      reports: [
        { id: "rawColorValue", line: 1, column: 22, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "String constants",
      code: `export const BRAND = { blue: "#0a7cff" };`,
      reports: [
        { id: "rawColorValue", line: 1, column: 30, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "String constants",
      code: `const gridStroke = "rgb(200 200 200)";`,
      reports: [
        { id: "rawColorValue", line: 1, column: 20, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "String constants",
      code: `<Chart colors={["#ff0000", "#00ff00"]} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 26 },
        { id: "rawColorValue", line: 1, column: 28, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "String constants",
      code: `function brand() { return "#0a7cff"; }`,
      reports: [
        { id: "rawColorValue", line: 1, column: 27, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "String constants",
      code: `const brandOf = () => "#0a7cff";`,
      reports: [
        { id: "rawColorValue", line: 1, column: 23, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "String constants",
      code: `canvas.getContext("2d").fillStyle = "#ff0000";`,
      reports: [
        { id: "rawColorValue", line: 1, column: 37, endLine: 1, endColumn: 46 },
      ],
    },
    {
      kind: "caught",
      group: "String constants",
      code: `function Swatch({ color = "#ff0000" }) {}`,
      reports: [
        { id: "rawColorValue", line: 1, column: 27, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "String constants",
      code: `const fallback = props.color ?? "#ff0000";`,
      reports: [
        { id: "rawColorValue", line: 1, column: 33, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "String constants",
      code: `const ink = dark ? "#000000" : "#ffffff";`,
      reports: [
        { id: "rawColorValue", line: 1, column: 20, endLine: 1, endColumn: 29 },
        { id: "rawColorValue", line: 1, column: 32, endLine: 1, endColumn: 41 },
      ],
    },

    // The three non-color keywords. `currentColor` is a reference to a cascade that, under
    // this rule, always ends in a token; `transparent` names the absence of a colour and no
    // token could replace it; the CSS-wide keywords name a cascade operation. They are what
    // people reach for when they have done the right thing, and flagging them would train
    // developers to suppress the rule.
    {
      kind: "allowed",
      group: "The three non-color keywords",
      code: `<svg><path fill="currentColor" /></svg>`,
    },
    {
      kind: "allowed",
      group: "The three non-color keywords",
      code: `<circle fill="transparent" stroke="currentColor" />`,
    },
    {
      kind: "allowed",
      group: "The three non-color keywords",
      code: `<div className="border-[transparent]" />`,
    },
    {
      kind: "allowed",
      group: "The three non-color keywords",
      code: `<div style={{ color: "currentColor" }} />`,
    },
    {
      kind: "allowed",
      group: "The three non-color keywords",
      code: `<div style={{ backgroundColor: "transparent" }} />`,
    },
    {
      kind: "allowed",
      group: "The three non-color keywords",
      code: `<div style={{ color: "inherit" }} />`,
    },
    {
      kind: "allowed",
      group: "The three non-color keywords",
      code: `<div style={{ borderColor: "revert" }} />`,
    },
    {
      kind: "allowed",
      group: "The three non-color keywords",
      code: `<div className="bg-[color-mix(in_oklch,var(--color-primary)_50%,transparent)]" />`,
    },

    // Relative colour syntax. `from` puts a colour where a colour function otherwise takes
    // numbers, so the call derives from whatever it is handed: a token in, a reference out —
    // the same reading `color-mix()` already gets, and for the same reason. A literal origin
    // is still a literal, and one report names the whole call, because the author wrote a
    // single value and has a single edit to make.
    {
      kind: "allowed",
      group: "Relative color syntax",
      code: `<div className="hover:bg-[oklch(from_var(--color-accent)_calc(l_-_0.01)_c_h)]" />`,
    },
    {
      kind: "allowed",
      group: "Relative color syntax",
      code: `<div style={{ color: "rgb(from var(--color-primary) r g b / 0.5)" }} />`,
    },
    {
      kind: "caught",
      group: "Relative color syntax",
      code: `<div className="bg-[oklch(from_#f00_l_c_h)]" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 44 },
      ],
    },
    {
      kind: "caught",
      group: "Relative color syntax",
      code: `<rect fill="oklch(from red calc(l - 0.01) c h)" />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 7, endLine: 1, endColumn: 48 },
      ],
    },

    // Fully transparent literals. A colour with a zero alpha is `transparent` spelled another
    // way: it paints nothing, and no token could replace it. Any alpha above zero is a colour.
    {
      kind: "allowed",
      group: "Fully transparent literals",
      code: `<div style={{ backgroundColor: "rgba(0, 0, 0, 0)" }} />`,
    },
    {
      kind: "allowed",
      group: "Fully transparent literals",
      code: `const TRANSPARENT = "#00000000";`,
    },
    {
      kind: "allowed",
      group: "Fully transparent literals",
      code: `<div className="bg-[#0000]" />`,
    },
    {
      kind: "allowed",
      group: "Fully transparent literals",
      code: `<rect fill="hsl(0 0% 0% / 0%)" />`,
    },
    {
      kind: "allowed",
      group: "Fully transparent literals",
      code: `<div className="bg-[oklch(0.5_0.1_20/0)]" />`,
    },
    {
      kind: "caught",
      group: "Fully transparent literals",
      code: `const faint = "#00000001";`,
      reports: [
        { id: "rawColorValue", line: 1, column: 15, endLine: 1, endColumn: 26 },
      ],
    },

    // Inside an SVG `<mask>`. A mask's colours decide how much of what it masks shows through
    // — white shows, black hides — and nothing inside one is painted. A gradient the mask only
    // references through `url(#…)` sits outside it and is still reported: the accepted cost of
    // not following references.
    {
      kind: "allowed",
      group: "Inside an SVG mask",
      code: `<mask id="m"><rect fill="white" /><rect fill="black" /></mask>`,
    },
    {
      kind: "allowed",
      group: "Inside an SVG mask",
      code: `<mask id="m"><rect style={{ fill: "#fff" }} /></mask>`,
    },
    {
      kind: "allowed",
      group: "Inside an SVG mask",
      code: `<mask id="m"><rect className="fill-[#fff]" /></mask>`,
    },
    {
      kind: "caught",
      group: "Inside an SVG mask",
      code: `<g mask="url(#m)"><rect fill="white" /></g>`,
      reports: [
        { id: "rawColorValue", line: 1, column: 25, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "Inside an SVG mask",
      code: `<linearGradient id="g"><stop stopColor="black" /></linearGradient>`,
      reports: [
        { id: "rawColorValue", line: 1, column: 30, endLine: 1, endColumn: 47 },
      ],
    },

    // Token references.
    {
      kind: "allowed",
      group: "Token references",
      code: `<div className="bg-primary text-primary-foreground" />`,
    },
    {
      kind: "allowed",
      group: "Token references",
      code: `<div className="bg-[var(--color-primary)]" />`,
    },
    {
      kind: "allowed",
      group: "Token references",
      code: `<div className="text-[--color-primary]" />`,
    },
    {
      kind: "allowed",
      group: "Token references",
      code: `<div style={{ "--color-brand": userColor }} />`,
    },
    {
      kind: "allowed",
      group: "Token references",
      code: `<svg><path fill="var(--color-primary)" /></svg>`,
    },
    // Allowed here and only here: `light-dark()` itself is `no-dark-variant`'s to ban. This
    // rule inspects the arguments, finds no literal, and stays quiet; `light-dark(#000, #fff)`
    // reports under both.
    {
      kind: "allowed",
      group: "Token references",
      code: `<div className="bg-[light-dark(var(--color-fg-light),var(--color-fg-dark))]" />`,
    },

    // `url()` and fragment references. Everything inside `url()` is an address; the `#` there
    // is a fragment identifier — usually an SVG element reference — not a hex colour.
    {
      kind: "allowed",
      group: "`url()` and fragment references",
      code: `<svg><path fill="url(#gradient-primary)" /></svg>`,
    },
    {
      kind: "allowed",
      group: "`url()` and fragment references",
      code: `<rect mask="url(#mask-fade)" />`,
    },
    {
      kind: "allowed",
      group: "`url()` and fragment references",
      code: `<div className="bg-[url('/img.png')]" />`,
    },
    {
      kind: "allowed",
      group: "`url()` and fragment references",
      code: `<div style={{ backgroundImage: "url('/img/hero.png#anchor')" }} />`,
    },

    // Comments. A literal in a comment is prose about a colour. The rule reads string and
    // template literals and a comment is neither, so this needs no carve-out.
    {
      kind: "allowed",
      group: "Comments",
      code: `// brand blue is #0a7cff
<div className="bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Comments",
      code: `/* was rgb(255, 0, 0) before the rebrand */
<div className="bg-danger" />`,
    },

    // Non-color arbitrary values: sizes, grid tracks, a malformed hex, and a colour name
    // buried inside an animation name.
    {
      kind: "allowed",
      group: "Non-color arbitrary values",
      code: `<div className="w-[calc(100%-2rem)]" />`,
    },
    {
      kind: "allowed",
      group: "Non-color arbitrary values",
      code: `<div className="grid-cols-[1fr_auto]" />`,
    },
    {
      kind: "allowed",
      group: "Non-color arbitrary values",
      code: `<div className="text-[13px]" />`,
    },
    {
      kind: "allowed",
      group: "Non-color arbitrary values",
      code: `<div className="bg-[#zz]" />`,
    },
    {
      kind: "allowed",
      group: "Non-color arbitrary values",
      code: `<div className="animate-[fadeToRed_2s]" />`,
    },

    // Option: standalone color literal checking. Turning it off leaves color contexts intact:
    // constants stop reporting, but attributes still do.
    {
      kind: "allowed",
      group: "Options",
      code: `const SERIES = ["#ff0000"];`,
      options: { checkStandaloneColorLiterals: false },
    },
    {
      kind: "caught",
      group: "Options",
      code: `<path fill="#ff0000" />`,
      options: { checkStandaloneColorLiterals: false },
      reports: [
        { id: "rawColorValue", line: 1, column: 7, endLine: 1, endColumn: 21 },
      ],
    },

    // Non-color strings. Anchors, ids, selectors and prose with `#` are not whole-string
    // colour literals. The last two are the point of the context-scoped model: `red` and
    // `tomato` are named colours, but neither sits in a colour-carrying context.
    {
      kind: "allowed",
      group: "Non-color strings",
      code: `<a href="#pricing">Pricing</a>`,
    },
    {
      kind: "allowed",
      group: "Non-color strings",
      code: `<div id="app-root" />`,
    },
    {
      kind: "allowed",
      group: "Non-color strings",
      code: `document.querySelector("#app-root");`,
    },
    {
      kind: "allowed",
      group: "Non-color strings",
      code: `const heading = "Rules #1 and #2";`,
    },
    {
      kind: "allowed",
      group: "Non-color strings",
      code: `const label = "red";`,
    },
    {
      kind: "allowed",
      group: "Non-color strings",
      code: `const theme = { name: "tomato" };`,
    },

    // Dynamically composed values. The line is "literal present or not": none of these writes
    // a colour down. A class with an interpolation in it is not checked, because the rule
    // cannot know what it becomes — every rule in the package draws that line in the same
    // place. Complete classes in the same template still are (the caught case below).
    {
      kind: "blindspot",
      group: "Dynamically composed values",
      code: `const hue = 0;
<div className={\`bg-[hsl(\${hue},100%,50%)]\`} />;`,
    },
    {
      kind: "blindspot",
      group: "Dynamically composed values",
      code: `<div className={\`bg-[\${hex}]\`} />;`,
    },
    {
      kind: "blindspot",
      group: "Dynamically composed values",
      code: `<div className={\`bg-\${tone}\`} />;`,
    },
    {
      kind: "blindspot",
      group: "Dynamically composed values",
      code: `<div className={"bg-[#" + hexFromProps + "]"} />;`,
    },
    {
      kind: "blindspot",
      group: "Dynamically composed values",
      code: `<div style={{ color: computeColor(theme) }} />;`,
    },
    {
      kind: "blindspot",
      group: "Dynamically composed values",
      code: `<circle fill={props.seriesColor} />;`,
    },
    {
      kind: "caught",
      group: "Dynamically composed values",
      code: `<div className={\`bg-[#f00] \${extra}\`} />`,
      reports: [
        { id: "rawColorValue", line: 1, column: 18, endLine: 1, endColumn: 27 },
      ],
    },

    // A `var()` is read as a reference and its fallback is not inspected: the token applies
    // whenever it is defined. A named colour in a free-standing string is not recognised even
    // inside a colour function — outside an attribute, `style` property or bracket, a bare
    // word is not known to be a colour, and the backstop matches hex and function heads only.
    {
      kind: "blindspot",
      group: "A literal as a `var()` fallback, and named colours outside a colour context",
      code: `<div className="bg-[var(--brand,#f00)]" />;`,
    },
    {
      kind: "blindspot",
      group: "A literal as a `var()` fallback, and named colours outside a colour context",
      code: `const mix = "color-mix(in srgb, red 50%, blue)";`,
    },

    // Color literals embedded in longer strings. Whole-string matching is deliberate: a colour
    // spliced into prose has no delimiter, unlike a Tailwind bracket. The data URI is the
    // uncomfortable one — it is a real bypass — but telling it from a fragment identifier
    // means parsing the embedded document as another grammar.
    {
      kind: "blindspot",
      group: "Color literals embedded in longer strings",
      code: `const css = "color: #ff0000; padding: 4px";`,
    },
    {
      kind: "blindspot",
      group: "Color literals embedded in longer strings",
      code: `<div dangerouslySetInnerHTML={{ __html: "<b style='color:#f00'>hi</b>" }} />;`,
    },
    {
      kind: "blindspot",
      group: "Color literals embedded in longer strings",
      code: `<img src="data:image/svg+xml,<svg fill='#ff0000'></svg>" />;`,
    },

    // CSS-in-JS. CSS inside a styled-components / Emotion tagged template is a separate
    // surface with a separate parser; covering it would be a new rule, and it is not the same
    // surface as the deferred `.css` one.
    {
      kind: "blindspot",
      group: "CSS-in-JS",
      code: `const Box = styled.div\`
  color: #ff0000;
\`;`,
    },

    // Non-CSS color channels: a colour passed as a function argument. An argument is where a
    // string that only looks like hex turns up — `querySelector("#add")`, `navigate("#face")`
    // — and reporting every one would bury the real colours. `setProperty` is also
    // `no-style-color`'s sanctioned escape hatch being fed a literal; neither rule catches it.
    // Assigning the colour instead — `fillStyle = "#ff0000"` — is caught under String
    // constants.
    {
      kind: "blindspot",
      group: "Non-CSS color channels",
      code: `setBrandColor("#ff0000");`,
    },
    {
      kind: "blindspot",
      group: "Non-CSS color channels",
      code: `element.style.setProperty("--brand", "#ff0000");`,
    },

    // Not yet linted: the CSS surface. Recorded, never run. When `.css` returns, both models
    // apply to declarations — property-scoped for the colour-carrying properties in their
    // dashed spelling, and the backstop for any declaration value — at one report per
    // declaration. `@apply` brings the arbitrary-value surface back in CSS syntax.
    {
      kind: "deferred",
      lang: "css",
      group: "CSS declarations and @apply",
      code: `/* would be caught: color-only properties */
.a { color: #ff0000; }
.b { background-color: rgb(255 0 0); }
.c { border-top-color: oklch(0.7 0.15 30); }
.d { -webkit-text-fill-color: #ffffff80; }

/* would be caught: named and system values, via the property */
.e { color: red; }
.f { border: 1px solid darkslategray; }
.g { color: ButtonText; }

/* would be caught: shorthands, gradients and shadows, via the backstop */
.h { background: linear-gradient(#fff, #000); }
.i { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); }

/* would be caught: a custom property defined outside the token files */
.k { --brand: #ff0000; }

/* would not be caught: a mask's colours set how much shows through and never paint */
.j { mask-image: linear-gradient(#fff, transparent); }`,
    },
    {
      kind: "deferred",
      lang: "css",
      group: "CSS declarations and @apply",
      code: `/* would be allowed: references, keywords, comments, url(), content, preludes */
.a { color: var(--color-primary); }
.b { color: currentColor; background-color: transparent; }
.c { fill: url(#gradient-primary); }
.d::before { content: "#fff"; }
.e { grid-area: red; font-family: "Tomato", sans-serif; }

@supports (color: color(display-p3 1 0 0)) { .f { color: var(--color-primary); } }

@media (forced-colors: active) {
  /* the system-color carve-out: here they are the only correct values */
  .g { color: CanvasText; background-color: Canvas; }
}`,
    },
    {
      kind: "deferred",
      lang: "css",
      group: "CSS declarations and @apply",
      code: `/* would be caught */
.a { @apply bg-[#ff0000]; }
.b { @apply rounded-md border-[#f00] p-2; }

/* would be allowed */
.c { @apply bg-primary text-primary-foreground; }
.d { @apply bg-[var(--color-primary)]; }`,
    },
    // The token stylesheets' exemption should be definition-scoped when CSS returns: a
    // `--color-*` definition allowed, an ordinary declaration in the same file caught. The
    // old whole-file exemption was a concession to a dependency this package no longer has.
    {
      kind: "deferred",
      lang: "css",
      group: "Definition-scoped exemption in token stylesheets",
      code: `/* src/styles.css — a file listed in tokenFiles */
@theme { --color-primary: oklch(0.62 0.19 259); }   /* allowed: the definition */
.legacy-banner { color: #ff0000; }                   /* would be caught: not a definition */`,
    },
  ],
};
