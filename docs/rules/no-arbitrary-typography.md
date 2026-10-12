---
rule: no-arbitrary-typography
status: implemented
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-arbitrary-typography

Take font sizes, font weights, and letter spacing from your theme's scale.

A class such as `text-[13px]` picks a size no one else can find. The next screen picks `text-[12.5px]`, and the type scale turns into a list of near-duplicates nobody chose. The same goes for `font-[550]` and `tracking-[0.02em]`. If the scale is missing a step, add it to your token stylesheets once, and every call site can use it.

## Reports

This rule reports a bracketed value that sets a font size, a font weight, or letter spacing.

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

A bracketed value that reads a CSS variable is a reference to a decision made elsewhere, so it is allowed. CSS-wide keywords such as `inherit` are allowed too.

```tsx
<div className="text-(length:--hero-size)" />
<div className="font-(--weight) tracking-[var(--tracking-label)]" />
<div className="tracking-[inherit]" />
```

Bracketed values that set something else are not this rule's subject, even under the same prefix: a color, a line height, a font family.

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

When the bracketed value is exactly a value your theme already names, the rule offers that class as a suggestion: `font-[600]` → `font-semibold`, `tracking-[0.025em]` → `tracking-wide`. The match is literal. `text-[14px]` is not matched to a size defined as `0.875rem`, and no value is rounded to the nearest step.

A font size suggestion replaces a class that set only the size with a theme class that also sets the theme's line height for that size.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Stories are skipped by default; set `[]` to lint them. |

## Common fixes

- Replace the value with the nearest step of your scale, and check the result with a designer if the difference is visible.
- If the design really needs a new step, add a `--text-*`, `--font-weight-*`, or `--tracking-*` token to your token stylesheets and use its class.
- If the value is computed at runtime, pass it through a CSS variable: `text-(length:--hero-size)`.
