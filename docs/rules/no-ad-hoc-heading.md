---
rule: no-ad-hoc-heading
status: implemented
bias: false-positives
files: ["*.tsx", "*.jsx"]
---

# no-ad-hoc-heading

Use heading classes instead of setting heading typography at the call site.

A heading such as `<h2 className="text-xl font-bold">` defines its typography separately from the design system. Other pages may use slightly different sizes or weights for the same heading level. Adding typography classes to a heading class, such as `heading-2 font-bold`, creates the same inconsistency. Use a heading class such as `heading-1` or `heading-2` to keep the typography named, consistent, and easy to update.

## Reports

**A heading without a heading class.** This rule reports an `<h1>`–`<h6>` element that uses a font size or font weight class without a heading class. Either a size or a weight class is enough to trigger a report.

```tsx
<h1 className="text-3xl" />
<h4 className="font-semibold" />
<h2 className="mb-2 font-bold text-xl" />
<h3 className={cn("text-[32px]", isActive && "text-primary")} />
```

**An override to heading typography.** It also reports any element with both a heading class and a class that sets font size, font weight, line height, letter spacing, text transform, font family, or font style.

```tsx
<div className="heading-1 font-bold" />
<h1 className="heading-1 text-4xl font-bold" />
<span className="leading-tight heading-6" />
<h2 className="heading-2 md:text-3xl" />
```

Variants do not change the result. To change a heading at a breakpoint, switch to another heading class: `heading-2 md:heading-1`.

Each element is reported once, at its first offending class. The message names every class that changes the heading.

## Allows

Heading classes are allowed, including combinations with layout, spacing, and color classes.

```tsx
<h1 className="heading-1" />
<h2 className="heading-2 md:heading-1" />
<h3 className="heading-3 mt-4 mb-2 text-muted-foreground truncate" />
```

Heading elements without font size or font weight classes are allowed.

```tsx
<h2 className="text-primary mb-4 truncate" />
```

Typography classes on other elements are allowed when no heading class is present.

```tsx
<p className="text-3xl font-bold" />
```

## Does not see

- Heading components such as `<Heading>`, whose underlying element is defined in another file. A heading class passed to a component is still checked for overrides.
- `role="heading"` on another element.
- Class lists passed in a variable: `<h1 className={titleStyles} />`.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `headingClasses` | `["heading-*"]` | Glob patterns for your heading classes, matched against the class name without variants. |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Stories are skipped by default; set `[]` to lint them. |

```ts
"design/no-ad-hoc-heading": ["error", { headingClasses: ["title-*", "display"] }]
```

If your project has no heading classes, headings with font size or font weight classes are still reported. Turn the rule off until heading classes are available.

## Common fixes

- Replace font size and font weight classes with an existing heading class.
- Remove typography overrides, or use a heading class with the intended typography.
- If no heading class fits, add one to your stylesheets rather than styling the heading by hand.
