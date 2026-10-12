---
rule: no-arbitrary-typography
status: implemented
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-arbitrary-typography

Take font sizes, font weights, and letter spacing from your theme's scale.

An arbitrary value such as `text-[13px]`, `font-[550]`, or `tracking-[0.02em]` defines typography at the call site instead of using a named value from the design system. Similar values can accumulate across screens, making the typography harder to review and update. If no existing value fits, add a token to the design system so every call site can use it.

## Reports

This rule reports arbitrary values that set font size, font weight, or letter spacing.

```tsx
<div className="text-[13px]" />
<div className="text-[length:0.8rem]" />
<div className="font-[500]" />
<div className="tracking-[0.02em]" />
```

Variants, modifiers, and arbitrary properties do not change the result.

```tsx
<div className="md:hover:text-[13px]" />
<div className="text-[13px]/6" />
<div className="[font-size:13px]" />
```

It checks every string in the file, not only `className`, so values inside `cn()`, `cva()`, and constant maps are reported too.

## Allows

Values from your theme are allowed.

```tsx
<div className="text-sm font-semibold tracking-tight" />
```

Values that reference CSS variables are allowed because they keep the design decision outside the call site. CSS-wide keywords such as `inherit` are allowed too.

```tsx
<div className="text-(length:--hero-size)" />
<div className="font-(--weight) tracking-[var(--tracking-label)]" />
<div className="tracking-[inherit]" />
```

Arbitrary colors, line heights, and font families are not covered by this rule, even when they use the same utility prefix.

```tsx
<div className="text-[#f00]" />            // a color — see no-raw-color
<div className="text-sm/[20px] leading-[1.2]" />
<div className="font-[Inter]" />
```

## Does not see

- Typography set through the `style` prop: `style={{ fontSize: 13 }}`.
- Classes built by interpolation: `` `text-[${size}px]` ``.
- `@apply` in CSS files.

## Fix suggestions

When an arbitrary utility value exactly matches a named value in your theme, the rule suggests the corresponding class: `font-[600]` → `font-semibold`, `tracking-[0.025em]` → `tracking-wide`. The match is literal. `text-[14px]` is not matched to a size defined as `0.875rem`, and no value is rounded to the nearest step.

A suggested font size class also applies the line height defined for that size in your theme. Check the line height when replacing an arbitrary font size.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Stories are skipped by default; set `[]` to lint them. |

## Common fixes

- Replace the value with the nearest step of your scale, and check the result with a designer if the difference is visible.
- If the design needs a new step, add a `--text-*`, `--font-weight-*`, or `--tracking-*` token to your token stylesheets and use its class.
- If the value is computed at runtime, pass it through a CSS variable: `text-(length:--hero-size)`.
