# @evilmartians/design-lint

Design-token lint rules for Tailwind v4 projects using [Oxlint](https://oxc.rs/docs/guide/usage/linter).

The rules keep color decisions inside your design system. They catch hard-coded colors, Tailwind palette colors, local dark-mode branches, invalid token names, and component color overrides.

```sh
npm install --save-dev @evilmartians/design-lint oxlint
```

## Setup

Create `oxlint.config.ts`:

```ts
import { defineConfig } from "oxlint";
import { designLint } from "@evilmartians/design-lint/preset";

export default defineConfig(
  await designLint({
    tokenFiles: ["src/styles.css"],
    componentSources: ["@/components/ui/*"],
  }),
);
```

`tokenFiles` are the stylesheets that define your `--color-*` tokens.

`componentSources` are the import paths for your design-system components. Write them exactly as they appear in your code. For example, if your app imports `#/components/ui/button`, use `#/components/ui/*`, not `@/components/ui/*`.

If the project has no component library, pass `componentSources: []`. That turns off `no-component-color-override`.

> Do not keep both `oxlint.config.ts` and `.oxlintrc.json`. Oxlint auto-discovers the TypeScript config.

Example output:

```txt
src/App.tsx:5:46: error design(no-spectral-color): bg-red-500 — spectral color class; use bg-danger instead
src/App.tsx:8:21: error design(no-undefined-token): text-nonesuch generates no CSS — nonesuch is not defined; check the spelling, or add --color-nonesuch to your token stylesheet
```

## Rules

| Rule | What it reports |
| --- | --- |
| [`no-raw-color`](./docs/rules/no-raw-color.md) | Literal colors such as `#f00`, `rgb(...)`, `red`, and `bg-[#f00]` |
| [`no-spectral-color`](./docs/rules/no-spectral-color.md) | Tailwind palette classes such as `bg-red-500` |
| [`no-undefined-token`](./docs/rules/no-undefined-token.md) | Token-like color classes that generate no CSS |
| [`token-constraints`](./docs/rules/token-constraints.md) | Valid tokens used in the wrong role, such as `bg-muted-foreground` |
| [`no-style-color`](./docs/rules/no-style-color.md) | Color applied through React's `style` prop |
| [`no-opacity-modifier`](./docs/rules/no-opacity-modifier.md) | Color classes with opacity modifiers such as `bg-primary/50` |
| [`no-dark-variant`](./docs/rules/no-dark-variant.md) | Local theme branches written with `dark:` or `light-dark()` |
| [`no-useless-hover`](./docs/rules/no-useless-hover.md) | Hover styles on elements that are not interactive |
| [`no-component-color-override`](./docs/rules/no-component-color-override.md) | Color classes passed to design-system components through `className` |

Each rule has a short guide in [`docs/rules`](./docs/rules/): what it reports, what it allows, and how to fix it.

## Configuration

The preset gives every rule a recommended default. You can override individual rules in the usual Oxlint way:

```ts
export default defineConfig({
  ...(await designLint({
    tokenFiles: ["src/styles.css"],
    componentSources: ["@/components/ui/*"],
  })),
  rules: {
    "design/no-dark-variant": ["error", { flagNonColorUtilities: false }],
  },
});
```

When you restate a rule, you replace the options the preset gave it. If you only want to change severity, keep any required options with it. This matters most for `no-component-color-override`, because `componentSources` has no safe default.

## Integration report

To see how much of the design system a project leaves unchecked, run this from where you run `oxlint`:

```sh
npx design-lint report
```

```txt
design-lint report — oxlint.config.ts

Disabled rules (1 of 9)
  no-opacity-modifier  off

Disable comments (7)
  no-raw-color             4
  no-spectral-color        2
  (all rules, none named)  1

Ignored paths (ignorePatterns)
  src/legacy/**
```

- **Disabled rules** are rules turned `off` in your config, or never turned on. For example, `componentSources: []` leaves out `no-component-color-override`.
- **Disable comments** is the number of `oxlint-disable*` and `eslint-disable*` comments that silence design rules, broken down by rule. A comment that names no rule silences every rule, so it gets its own line. A comment that names two rules counts once in the total and once under each rule. Only files Oxlint lints are scanned.
- **Ignored paths** are the config's `ignorePatterns`.

It reads `oxlint.config.ts` the way Oxlint finds it. Pass `--config <file>` and paths to match how you run `oxlint`.

## Limits

These rules are intentionally static. They do not run your app or follow values across files.

Known limits:

- CSS files are not linted yet. Classes in `@apply` and colors in CSS declarations are out of scope for now.
- Dynamically assembled classes are not checked. For example, `` `bg-${tone}` `` is too ambiguous to validate.
- Most rules check strings where they are written, not where a value eventually flows.
- `no-undefined-token` only checks clear class-list positions such as `className`, class helper calls, `cva()` and `tv()`.

## Requirements

- Node 22.18+ or 23.6+
- Oxlint 1.82+
- Tailwind v4

The package uses `@tailwindcss/node` to read the same design system your Tailwind build uses. If your project already uses Tailwind through Vite, PostCSS, or the Tailwind CLI, it is usually already installed. Otherwise add it:

```sh
npm install --save-dev @tailwindcss/node
```

## ESLint

The rules can also run in ESLint v9 flat config. Resolve the design system first, then import the plugin:

```js
// eslint.config.mjs
import { designLint } from "@evilmartians/design-lint/preset";

const design = await designLint({
  tokenFiles: ["src/styles.css"],
  componentSources: ["@/components/ui/*"],
});

const designPlugin = (await import("@evilmartians/design-lint/oxlint")).default;

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { design: designPlugin },
    rules: design.rules,
  },
];
```

Use a dynamic `import()` for the plugin. The `designLint()` call prepares the token data the rules need, and the plugin reads it when it loads.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

MIT
