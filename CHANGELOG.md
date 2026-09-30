# Changelog

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

- A **new rule ships disabled**, and `designLint()` turns it on only in a major release.
  Turning one on in a minor makes a routine upgrade a failing build, which teaches
  people to pin — and a linter nobody upgrades stops matching the design system it was
  written for.
- **A rule catching strictly more** than it did — closing a declared blind spot, covering a
  utility family Tailwind added — is a **minor**. It can fail a build that passed, so it is
  never a patch.
- **A rule catching less**, a renamed rule or option, or a changed default is a **major**.
- Changes to a rule's *message text* are a patch. Nothing should parse them.
- Every one of these shows up as a change to a contract in `test/contracts/`, which is the
  diff worth reading in a release.
