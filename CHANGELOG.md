# Changelog

## 0.2.0

`designLint()` now supports two presets. The default enables two new rules, so
upgrading from 0.1.x may fail a previously passing build. To adopt them gradually,
set individual rules to `"off"` or `"warn"`, or record existing violations with
`oxlint --suppress-all`.

- **`strict`** (default) enables all rules. Existing configs need no changes and
  gain the two rules below. `componentSources` remains required.
- **`basic`** enables seven rules that require only token stylesheets. It excludes
  checks for token roles, local themes, opacity modifiers, and component color
  overrides. It rejects `componentSources`. See the [rule list](./README.md#rules).

- `no-arbitrary-typography` reports arbitrary font sizes, font weights, and letter spacing,
  such as `text-[13px]`, `font-[500]`, `tracking-[0.02em]`, and `[font-size:13px]`.
  CSS variable references are allowed. When an arbitrary utility value exactly matches a
  named theme value, the rule suggests its class: `font-[600]` → `font-semibold`.
- `no-arbitrary-radius` reports arbitrary corner radii, such as `rounded-[6px]`,
  `rounded-tl-[4px]`, and `[border-radius:6px]`. CSS variable references and CSS-wide
  keywords are allowed, including `rounded-[calc(var(--radius)-2px)]` and `rounded-[inherit]`.

## 0.1.5

- `design-lint report` counts bulk suppressions: the design violations
  `oxlint --suppress-all` recorded in `oxlint-suppressions.json`. A project that baselines
  its violations there no longer looks fully covered in the report. They are added to
  line disable comments in one section, **Silenced**, with one number per rule; the
  **Disable comments** section is gone. A comment naming two rules now counts once per
  rule in the total, too.
- A block `/* oxlint-disable */` or `/* eslint-disable */` comment silences the rest of the
  file, so the report lists its file under **Ignored paths**, next to `ignorePatterns`, with
  the rules it names.

## 0.1.4

- The rules load under ESLint 9. ESLint freezes the context it hands a rule, and every rule
  that reads the resolved design system threw on load with `'get' on proxy: property
  'options' is a read-only and non-configurable data property`. Oxlint was not affected.

## 0.1.3

- Tailwind 4.1.18 is the minimum, and the `@tailwindcss/node` peer range says so. The rules
  call a design-system method that 4.1.18 introduced, so on 4.1.17 and earlier every file
  failed with `designSystem.candidatesToAst is not a function`. An older engine now stops
  the run once, with an error naming the version it found.
- `@evilmartians/design-lint/preset` ships type declarations, so a strict
  `oxlint.config.ts` no longer reports TS7016 on the import.
- The README shows how to keep an existing `.oxlintrc.json` alongside the preset.

## 0.1.2

- `no-raw-color` no longer reports a color derived from a token with relative color syntax.
  `oklch(from var(--color-accent) calc(l - 0.01) c h)` reads `--color-accent` and adjusts a
  channel, so it is a reference, exactly as `color-mix(in oklch, var(--color-accent), …)`
  already was. A relative color derived from a literal — `oklch(from #f00 l c h)` — still
  reports, and names the whole call.

## 0.1.1

- `design-lint report` prints what a project's setup leaves unchecked: design rules that
  are off or never turned on, disable comments that silence them, and the config's
  `ignorePatterns`.

## 0.1.0

First release. Nine rules, each with a guide in `docs/rules/` and a contract in
`test/contracts/` whose cases are executed as its test suite.

- `no-raw-color`, `no-spectral-color`, `no-undefined-token`, `token-constraints`,
  `no-style-color`, `no-opacity-modifier`, `no-dark-variant`, `no-useless-hover`,
  `no-component-color-override`.
- `designLint()` factory for `oxlint.config.ts`, which turns on every rule.
- Every rule skips Storybook files through one option, `ignoreGlobs`, defaulting to
  `["**/*.stories.@(js|jsx|ts|tsx)"]`. Set it to `[]` to lint stories.
- `no-component-color-override` takes `ignore`: components the rule skips, meant for ones with no colour
  of their own, such as an icon drawn in the current text colour, listed by exported name.
  Colour classes on them are allowed. Defaults to `[]`.
- JavaScript and TypeScript only. The CSS surface is deferred, with contracts written.

### Versioning policy

- **Before 1.0, the minor number is the major.** A breaking release bumps the minor —
  0.1 → 0.2 — and npm's `^0.1.5` never installs 0.2.0, so it carries the same guarantee a
  major does after 1.0. Every "major" below means that bump while the version starts with 0.
- **Enabling a rule in a preset requires a breaking release.** New rules ship disabled;
  adding one to a preset or moving one from `strict` to `basic` can fail a previously
  passing build.
- **A rule catching strictly more** than it did — closing a declared blind spot, covering a
  utility family Tailwind added — is a **minor**. It can fail a build that passed, so it is
  never a patch.
- **A rule catching less**, a renamed rule or option, or a changed default is a **major**.
- Changes to a rule's *message text* are a patch. Nothing should parse them.
- Every one of these shows up as a change to a contract in `test/contracts/`, which is the
  diff worth reading in a release.
