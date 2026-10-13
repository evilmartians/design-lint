# Rule guide

Design Lint keeps product code aligned with a token-based design system. These rules are written for teams that want colors, typography, corner radii, themes, and component appearances to be named and reviewed in one place instead of recreated at each call site.

| Rule | What it does |
| --- | --- |
| [`no-style-color`](./no-style-color.md) | Reports color applied through React's `style` prop |
| [`no-raw-color`](./no-raw-color.md) | Reports literal colors such as `#fff`, `rgb(...)`, or `red` in application code |
| [`no-spectral-color`](./no-spectral-color.md) | Reports Tailwind palette classes such as `bg-red-500` when a semantic token should be used |
| [`no-undefined-token`](./no-undefined-token.md) | Reports token-like color classes that do not exist |
| [`token-constraints`](./token-constraints.md) | Reports valid tokens used in the wrong role, such as a text token as a background |
| [`no-opacity-modifier`](./no-opacity-modifier.md) | Reports color classes with opacity modifiers such as `/50` or `/75` |
| [`no-dark-variant`](./no-dark-variant.md) | Reports local theme branches written with `dark:` or `light-dark()` |
| [`no-useless-hover`](./no-useless-hover.md) | Reports hover styles on elements that are not interactive |
| [`no-component-color-override`](./no-component-color-override.md) | Reports color classes passed to design-system components through `className` |
| [`no-arbitrary-typography`](./no-arbitrary-typography.md) | Reports arbitrary font sizes, font weights, and letter spacing such as `text-[13px]` |
| [`no-arbitrary-radius`](./no-arbitrary-radius.md) | Reports arbitrary corner radii such as `rounded-[6px]` |
| [`no-ad-hoc-heading`](./no-ad-hoc-heading.md) | Reports headings styled without heading classes, and overrides to heading typography |

## The shared idea

Colors should be semantic. Code should say what a color means — `primary`, `danger`, `muted`, `border` — and the design system should decide what that means in each theme.

The rules cover three common ways this breaks down:

1. **A color is written directly.** Example: `#ff0000`, `red`, `rgb(...)`.
2. **A color bypasses the token vocabulary.** Example: `bg-red-500` or `bg-primary/50`.
3. **A token is used outside its intended role.** Example: `bg-muted-foreground`.

The same idea applies to typography and corner radii. Use named values from your theme's scales instead of arbitrary values at each call site. Heading classes keep a heading's typography in one place so it can be reviewed and updated across the project.

The goal is not to enforce a particular visual style. The goal is to keep design decisions named, searchable, themeable, and reviewable.
