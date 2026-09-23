# Changelog

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
