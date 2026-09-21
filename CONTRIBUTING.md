# Contributing

```
npm install
npm test
```

## Layout

| Path | What it owns |
| --- | --- |
| `src/preset/` | `designLint()`, the factory a consumer calls from `oxlint.config.ts`. It performs the package's one filesystem read: it loads the consumer's token stylesheets, resolves the Tailwind design system and the token set, and hands them to the plugin. |
| `src/oxlint.js` | The plugin Oxlint loads through `jsPlugins`. It binds what the factory resolved to the rules that need it. |
| `src/rules/` | The nine rules. |
| `src/cli.js`, `src/report/` | `design-lint report`: reads the consumer's Oxlint config, asks Oxlint which files it lints, and counts what is switched off. |
| `src/extract/` | Class-string extraction. A broad sweep of every string in the file for the token rules; a precise walk of one element's `className` for the JSX rules. |
| `src/policy/` | What several rules share: variant parsing, the class tokenizer, colour matching, and the questions asked of the design system and the token set. Exported as `/policy`. |
| `docs/rules/` | One guide per rule, written for the people whose code it reports. Shipped. |
| `test/contracts/` | One contract per rule: every case it catches, allows, or cannot see, run as its test suite. See its [README](./test/contracts/README.md). |
| `test/harness/` | What the tests supply in place of the factory, and the location fixtures. See its [README](./test/harness/README.md). |

## Principles

### Mechanism ships, policy is supplied

A rule knows *how* to find a colour that bypasses the token system. Everything that is a
project's opinion — which tokens may go on which utilities, which palette families map to
which semantic names, which components own their own colour, whether `dark:` is banned —
is a rule option with a recommended default. A project shaped differently configures a
rule rather than forking one.

### Only the factory reads files

- Everything a rule knows arrives through its options, or is bound to it by the plugin.
  Reading stylesheets and building the design system happens once, in the factory — never
  in `create()`. That keeps each rule a function of its options, and `RuleTester` usable.
- Nothing derives a path from its own location. Every path arrives as input, relative to
  the consumer's working directory.
- The design system and the token set are *bound* rather than passed as options, because
  Oxlint hands a plugin its options as JSON: an object with methods, or a `Set`, arrives as
  an empty husk and nothing warns. See `src/plugin.js`.

### An empty report must mean a clean codebase

Oxlint replaces rule options rather than merging them, silently: a consumer who restates a
rule's severity drops the options the factory passed. So every rule carries a usable
baseline in `meta.defaultOptions`, and a rule missing an input it cannot run without
throws rather than reporting nothing. A rule that cannot run and a codebase with no
violations must never look the same.

## Writing a rule

- **Plain `create`, not `createOnce`.** `createOnce` is faster under Oxlint, but it needs a
  compatibility wrapper to run anywhere else. Keeping rules in the ESLint v9 shape is what
  keeps them portable if Oxlint's alpha plugin API moves.
- **`messageId` and `data`, never a pre-formatted string.** Oxlint owns formatting.
- **Everything the developer needs goes in the message text.** Suggestions appear in no CLI
  output format, and Oxlint does not surface `meta.docs.url`. A suggestion is an editor
  quick-fix on top of the message, never the only place a replacement is named.
- **Suggestion order matters.** `oxlint --fix-suggestions` applies the first one without
  asking, so a destructive suggestion — removing the class — never comes first.
- **Suppression is the runner's.** `// oxlint-disable-next-line design/<rule>`, and Oxlint
  honours `eslint-disable-next-line` too. No rule has an ignore comment of its own.
- **Give the rule a `meta.schema`.** Oxlint rejects options for a rule that has none.
- **The namespace is public API.** `design/` appears in every diagnostic and every disable
  comment a consumer writes; it does not change outside a major.

## Changing a rule

Change its contract in the same commit. The contract is the specification and the test
suite at once — [`test/contracts/README.md`](./test/contracts/README.md) describes the
format. If the change is visible to someone whose code the rule reports, update its guide
in `docs/rules/` too.

A new rule needs all three: a contract, a guide, and a location fixture in
`test/harness/locations.test.js` — a test fails without the fixture. New rules ship
disabled; the full versioning policy is in [`CHANGELOG.md`](./CHANGELOG.md).

## Trying a change in a real project

Install from a tarball:

```
npm pack --pack-destination .pack
# then, in the project:
npm install --save-dev /path/to/design-lint/.pack/evilmartians-design-lint-0.1.0.tgz
```

Never `npm install ../design-lint` or `npm link`. A symlinked install resolves
`@tailwindcss/node` from this repository's `node_modules` rather than the project's, and it
can load the factory and the plugin as two module instances — one through the link, one
through its real path — so the resolved design system never reaches the rules. A tarball
installs exactly the way a registry would. Re-pack and reinstall after every change.

## Why Oxlint, and why this shape

- **Oxlint** is fast, and its JS plugin API is deliberately ESLint v9-shaped: `create`,
  `messageId`, fixes, suggestions. It ships a `RuleTester` (`oxlint/plugins-dev`) that runs
  under Vitest.
- **ESLint v9** is the contingency rather than a second target. The rules are written so
  they would run under it unchanged.
- **Biome** lints JavaScript and CSS from one binary, but its custom rules are GritQL
  patterns, which cannot express per-prefix allow lists with glob semantics or a lookup
  against the Tailwind design system.

What Oxlint's JS plugins constrain:

- **They are alpha**, not semver-stable. The peer floor is in `package.json`.
- **JavaScript and TypeScript only** — no CSS parser. That is why the CSS surface is
  deferred. When it lands, it joins this package rather than a second one, so the two
  halves of one rule's coverage cannot drift apart in version.
- **No type information.** Every rule is syntactic.
- **`jsPlugins` takes a module specifier, never a plugin object**, and `plugins` is
  reserved for Oxlint's built-in Rust plugins. So the factory can only *name* the plugin.
  The two share one process and one module registry, with the config evaluated first,
  which is how the factory hands over what it resolved: through `src/preset/resolved.js`.
- **`settings` is not inherited through `extends`**, and `extends` in `.oxlintrc.json`
  resolves filesystem paths only. A preset could never carry the inputs its own rules
  need, which is why setup is a factory the consumer calls rather than a config they
  extend.
