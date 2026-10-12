---
rule: no-arbitrary-radius
status: implemented
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-arbitrary-radius

Take corner radii from your theme's scale.

An arbitrary value such as `rounded-[6px]` defines a corner radius at the call site instead of using a named value from the design system. Similar radii can accumulate across components, making their shapes inconsistent and harder to update. If no existing value fits, add a token to the design system.

## Reports

This rule reports arbitrary border radius values, including those applied to individual corners or sides.

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

Values that reference CSS variables are allowed. This includes an inner corner radius computed from the outer radius of a containing element. CSS-wide keywords such as `inherit` are allowed too.

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

When an arbitrary utility value exactly matches a named value in your theme, the rule suggests the corresponding class: `rounded-[0.5rem]` → `rounded-lg` in a default theme. The match is literal: no unit is converted and no value is rounded to the nearest step.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Stories are skipped by default; set `[]` to lint them. |

## Common fixes

- Replace the value with the nearest step of your scale.
- For a corner nested inside another rounded element, derive it from the outer radius: `rounded-[calc(var(--radius)-2px)]`.
- If the design needs a new step, add a `--radius-*` token to your token stylesheets and use its class.
