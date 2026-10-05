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

### Keeping an existing `.oxlintrc.json`

Oxlint refuses to start when `oxlint.config.ts` and `.oxlintrc.json` sit in the same directory, and the setup above needs the TypeScript config. To keep your JSON config as it is, rename it (to `oxlint.base.json`, say) and merge it in:

```ts
import { defineConfig, type OxlintConfig } from "oxlint";
import { designLint } from "@evilmartians/design-lint/preset";
import json from "./oxlint.base.json" with { type: "json" };

const base = json as OxlintConfig;
const design = await designLint({
  tokenFiles: ["src/styles.css"],
  componentSources: ["@/components/ui/*"],
});

export default defineConfig({
  ...base,
  jsPlugins: [...(base.jsPlugins ?? []), ...design.jsPlugins],
  rules: { ...base.rules, ...design.rules },
});
```

Merge it rather than passing it through `extends`: Oxlint rejects relative `jsPlugins` paths in a config that arrives through `extends`.

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
npx @evilmartians/design-lint report
```

```txt
design-lint report — oxlint.config.ts

Disabled rules (1 of 9)
  no-opacity-modifier  off

Silenced (49)
  no-raw-color             34
  no-dark-variant          12
  no-spectral-color        2
  (all rules, none named)  1

Ignored paths (ignorePatterns)
  src/legacy/**
```

- **Disabled rules** are rules turned `off` in your config, or never turned on. For example, `componentSources: []` leaves out `no-component-color-override`.
- **Silenced** is the number of design-rule violations hidden in code Oxlint lints, broken down by rule. It adds up `oxlint-disable*` and `eslint-disable*` comments that name a design rule and the violations `oxlint --suppress-all` recorded in `oxlint-suppressions.json`. A comment that names two rules counts under each rule. A comment that names no rule silences every rule, so it gets its own line. Oxlint reads `oxlint-suppressions.json` from the directory it runs in, and so does the report.
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
- Tailwind 4.1.18+

The package uses `@tailwindcss/node` to read the same design system your Tailwind build uses. It takes the copy your project resolves, so installing a newer one alongside an older Tailwind does not help: upgrade the project's Tailwind. If your project already uses Tailwind through Vite, PostCSS, or the Tailwind CLI, it is usually already installed. Otherwise add it:

```sh
npm install --save-dev @tailwindcss/node
```

## ESLint

The rules can also run in an ESLint v9 flat config. Add three things to your existing `eslint.config.mjs`:

```js
// eslint.config.mjs
import { designLint } from "@evilmartians/design-lint/preset";

// 1. Resolve the design system.
const design = await designLint({
  tokenFiles: ["src/styles.css"],
  componentSources: ["@/components/ui/*"],
});

// 2. Then load the plugin.
const designPlugin = (await import("@evilmartians/design-lint/oxlint")).default;

export default [
  // ...your existing config

  // 3. Turn the rules on for your component files.
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { design: designPlugin },
    rules: design.rules,
  },
];
```

Use a dynamic `import()` for the plugin. The `designLint()` call prepares the token data the rules need, and the plugin reads it when it loads.

The rules use whatever parser your config already sets for these files, so it must read JSX, and TypeScript if you use it.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

MIT
