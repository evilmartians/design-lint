# Rule guide

Design Lint keeps product code aligned with a token-based design system. These rules are written for teams that want colors, typography, corner radii, themes, and component appearances to be named and reviewed in one place instead of recreated at each call site.

The **basic** preset enables rules that require only token stylesheets. The **strict** preset adds checks for project conventions, such as token naming and component variants. In the table below, **basic** means both presets; **strict** means strict only.

| Rule | What it does | Preset |
| --- | --- | --- |
| [`no-style-color`](./no-style-color.md) | Reports color applied through React's `style` prop | basic |
| [`no-raw-color`](./no-raw-color.md) | Reports literal colors such as `#fff`, `rgb(...)`, or `red` in application code | basic |
| [`no-spectral-color`](./no-spectral-color.md) | Reports Tailwind palette classes such as `bg-red-500` when a semantic token should be used | basic |
| [`no-undefined-token`](./no-undefined-token.md) | Reports token-like color classes that do not exist | basic |
| [`token-constraints`](./token-constraints.md) | Reports valid tokens used in the wrong role, such as a text token as a background | strict |
| [`no-opacity-modifier`](./no-opacity-modifier.md) | Reports color classes with opacity modifiers such as `/50` or `/75` | strict |
| [`no-dark-variant`](./no-dark-variant.md) | Reports local theme branches written with `dark:` or `light-dark()` | strict |
| [`no-useless-hover`](./no-useless-hover.md) | Reports hover styles on elements that are not interactive | basic |
| [`no-component-color-override`](./no-component-color-override.md) | Reports color classes passed to design-system components through `className` | strict |
| [`no-arbitrary-typography`](./no-arbitrary-typography.md) | Reports arbitrary font sizes, font weights, and letter spacing such as `text-[13px]` | basic |
| [`no-arbitrary-radius`](./no-arbitrary-radius.md) | Reports arbitrary corner radii such as `rounded-[6px]` | basic |

## The shared idea

Colors should be semantic. Code should say what a color means — `primary`, `danger`, `muted`, `border` — and the design system should decide what that means in each theme.

The rules cover three common ways this breaks down:

1. **A color is written directly.** Example: `#ff0000`, `red`, `rgb(...)`.
2. **A color bypasses the token vocabulary.** Example: `bg-red-500` or `bg-primary/50`.
3. **A token is used outside its intended role.** Example: `bg-muted-foreground`.

The same idea applies to typography and corner radii. Use named values from your theme's scales instead of arbitrary values at each call site.

The goal is not to enforce a particular visual style. The goal is to keep design decisions named, searchable, themeable, and reviewable.
