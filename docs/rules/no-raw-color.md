---
rule: no-raw-color
status: implemented
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-raw-color

Do not write literal colors in application code.

A literal color such as `#0a7cff`, `rgb(10 124 255)`, or `red` is not connected to the design system. It will not change when the theme changes, it cannot be audited as a token, and future readers cannot tell what role it was meant to play.

Use semantic tokens instead. If no existing token fits, add one to the design system rather than inlining the value.

## Reports

This rule reports raw color values in color-carrying places.

### Tailwind arbitrary values

```tsx
<div className="bg-[#ff0000]" />
<div className="text-[rgb(255,0,0)]" />
<div className="border-[red]" />
<div className="shadow-[0_0_4px_#000]" />
```

### JSX color attributes

```tsx
<path fill="#ff0000" />
<rect stroke="red" />
<Badge color="#0a7cff" />
```

### Style values

```tsx
<div style={{ color: "#f00" }} />
<div style={{ background: "linear-gradient(#fff, #000)" }} />
```

### Color constants

```tsx
const brand = "#0a7cff";
const chartColors = ["#ff0000", "#00ff00"];
```

## Allows

Token references are allowed.

```tsx
<div className="bg-primary text-primary-foreground" />
<div className="bg-[var(--color-primary)]" />
<path fill="var(--color-primary)" />
```

A color derived from a token is a reference too, whether it is derived with `color-mix()` or with relative color syntax. Derive it from a literal and it is a literal again.

```tsx
<div className="hover:bg-[oklch(from_var(--color-accent)_calc(l_-_0.01)_c_h)]" />
<div className="bg-[color-mix(in_oklch,var(--color-primary)_50%,transparent)]" />
```

The values `currentColor`, `transparent`, and CSS-wide cascade keywords such as `inherit` are allowed. So is any color with a zero alpha, such as `#0000` or `rgba(0, 0, 0, 0)`, which is `transparent` written another way.

```tsx
<path fill="currentColor" />
<div className="border-[transparent]" />
<div style={{ color: "inherit" }} />
```

Colors inside an SVG `<mask>` are allowed. In a mask, white and black decide what shows through; nothing is painted in them.

```tsx
<mask id="fade"><rect fill="white" /></mask>
```

Non-color strings are allowed.

```tsx
<a href="#pricing">Pricing</a>
const label = "red";
```

## Options

Every option has a default, so you only set the ones you want to change.

| Option | Default | What it does |
| --- | --- | --- |
| `namedColors` | `true` | Reports named and system colors (`fill="red"`, `text-[red]`, `bg-[ButtonText]`). `false` lets them through. |
| `checkStandaloneColorLiterals` | `true` | Reports a string that is entirely a hex or color-function literal wherever a value is written down, such as `const SERIES = ["#ff0000"]`. `false` checks only color attributes, `style` values and class strings. |
| `ignoreValues` | `["transparent", "currentColor", "inherit", "initial", "unset", "revert", "revert-layer"]` | Extra values to suppress, matched case-insensitively. It can suppress an exact whole value, and named/system colors such as `red` when they appear in a color context. It does not suppress hex or color-function literals embedded inside a longer value, such as `0 0 4px #fff`. |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Set it to `[]` to lint stories too. |

Setting options replaces the ones the recommended setup passed to this rule — see [Configuring rules](../../README.md#mechanism-ships-policy-is-supplied).

## Common fixes

- Replace the literal with an existing semantic token.
- Add a new token when the color represents a new design role.
- Use `currentColor` when an icon or child element should inherit the surrounding text color.
