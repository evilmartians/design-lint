---
rule: no-ad-hoc-heading
status: implemented
bias: false-positives
files: ["*.tsx", "*.jsx"]
---

# no-ad-hoc-heading

Style headings with your heading classes, and use those classes as they are.

When a design system has heading classes such as `heading-1`…`heading-6`, a heading written as `<h2 className="text-xl font-bold">` is a copy of one of them, or nearly. Copies drift: the next page uses `text-xl font-semibold`, and the two headings no longer match. A heading class with another size or weight added on top, such as `heading-2 font-bold`, drifts the same way. One class keeps a heading's typography in one place, so the design system can change it there.

## Reports

**A heading styled by hand.** An `<h1>`–`<h6>` with no heading class that sets a font size or a font weight with a class of its own. Either one is enough.

```tsx
<h1 className="text-3xl" />
<h4 className="font-semibold" />
<h2 className="mb-2 font-bold text-xl" />
<h3 className={cn("text-[32px]", isActive && "text-primary")} />
```

**A heading class with its typography changed.** Any element with a heading class and another class that sets a font size, weight, line height, letter spacing, text transform, font family, or font style.

```tsx
<div className="heading-1 font-bold" />
<h1 className="heading-1 text-4xl font-bold" />
<span className="leading-tight heading-6" />
<h2 className="heading-2 md:text-3xl" />
```

Variants do not change the result. To change a heading at a breakpoint, switch to another heading class: `heading-2 md:heading-1`.

Each element is reported once, at its first offending class. The message names every class that changes the heading.

## Allows

A heading class, alone or with classes that place or color it:

```tsx
<h1 className="heading-1" />
<h2 className="heading-2 md:heading-1" />
<h3 className="heading-3 mt-4 mb-2 text-muted-foreground truncate" />
```

A heading tag with no size or weight of its own:

```tsx
<h2 className="text-primary mb-4 truncate" />
```

Typography on other elements, as long as they carry no heading class:

```tsx
<p className="text-3xl font-bold" />
```

## Does not see

- Heading components such as `<Heading>`, whose element is decided in another file. A heading class passed to a component is still checked for overrides.
- `role="heading"` on another element.
- Class lists passed in a variable: `<h1 className={titleStyles} />`.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `headingClasses` | `["heading-*"]` | Globs naming your heading classes, matched against the class without its variants. |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Stories are skipped by default; set `[]` to lint them. |

```ts
"design/no-ad-hoc-heading": ["error", { headingClasses: ["title-*", "display"] }]
```

If your project has no heading classes, a heading tag with a size or a weight is still reported. Turn the rule off until you have them.

## Common fixes

- Replace the size and weight classes with the heading class they copy.
- Drop the classes that change a heading class, or switch to the heading class that already looks that way.
- If no heading class fits, add one to your stylesheets rather than styling the heading by hand.
