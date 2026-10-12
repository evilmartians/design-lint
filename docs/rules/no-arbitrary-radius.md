---
rule: no-arbitrary-radius
status: implemented
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-arbitrary-radius

Take corner radii from your theme's scale.

A class such as `rounded-[6px]` sits between two steps of the scale and matches neither. A card with `rounded-[6px]` next to a button with `rounded-md` looks almost aligned, which reads as a mistake. If the scale is missing a step, add it to your token stylesheets once.

## Reports

This rule reports a bracketed value that sets a border radius, on any corner or side.

```tsx
<div className="rounded-[6px]" />
<div className="rounded-tl-[4px]" />
<div className="rounded-s-[3px]" />
<div className="hover:rounded-[6px]" />
<div className="rounded-[calc(0.5rem-2px)]" />
<div className="[border-radius:6px]" />
```

It checks every string in the file, not only `className`.

## Allows

Values from your theme are allowed.

```tsx
<div className="rounded-lg rounded-t-md rounded-full rounded-none" />
```

A value that reads a CSS variable stays tied to that variable, so it is allowed. That includes the common nested-corner pattern, an inner radius computed from the outer one. `inherit` is allowed too.

```tsx
<div className="rounded-[calc(var(--radius)-2px)]" />
<div className="rounded-(--radius-card)" />
<div className="rounded-[inherit]" />
```

## Does not see

- Radii set through the `style` prop: `style={{ borderRadius: 6 }}`.
- Classes built by interpolation: `` `rounded-[${radius}px]` ``.
- `@apply` in CSS files.

## Fix suggestions

When the bracketed value is exactly a value your theme already names, the rule offers that class as a suggestion: `rounded-[0.5rem]` → `rounded-lg` in a default theme. The match is literal: no unit is converted and no value is rounded to the nearest step.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Stories are skipped by default; set `[]` to lint them. |

## Common fixes

- Replace the value with the nearest step of your scale.
- For a corner nested inside another rounded element, derive it from the outer radius: `rounded-[calc(var(--radius)-2px)]`.
- If the design needs a new step, add a `--radius-*` token to your token stylesheets and use its class.
