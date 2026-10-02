---
name: opacity-tokens
description: Replace Tailwind opacity modifiers (`bg-primary/50`) with named theme tokens in a repo that uses @evilmartians/design-lint. Use when enabling `no-opacity-modifier`, fitting opacity steps or a translucent token ladder, or reporting how much of a codebase derives colors at call sites.
---

# Opacity tokens

Turns `no-opacity-modifier` on and replaces the most common `/N` modifiers with theme tokens. Each **role** gets its own **ladder** of opacity **steps**:

- **surface**: `bg`, gradients, `fill`, `shadow`
- **line**: `border`, `ring`, `divide`, `outline`, `stroke`
- **text**: `text`, `placeholder`, `caret`

A class becomes `bg-accent-veil` instead of `bg-accent/50`. Every value **snaps** to the nearest step in its role, or stays a lint error for a person to decide. Text only snaps up, so contrast never drops. The run ends with a self-contained HTML report: the steps, the tokens, fixed and remaining errors, and before/after Storybook screenshots.

The scripts live in `scripts/` next to this file. Below, `$SKILL` is this folder and `$W` is a work directory in the session's scratchpad.

## Steps

### 1. Work in a worktree

Check that `@evilmartians/design-lint` is in `package.json` and the tree is clean. Then:

```sh
git worktree add -b opacity-tokens ../<repo>-opacity-tokens HEAD
ln -s "$PWD/node_modules" ../<repo>-opacity-tokens/node_modules
```

All edits happen in the worktree. The original checkout stays on the base branch so it can build the "before" Storybook. Done when the worktree exists and `git status` there is clean.

### 2. Turn the rule on

The preset enables every rule, so `no-opacity-modifier` is only ever off through an override in the project's config: `oxlint.config.ts` / `.mts`, or the ESLint flat config that calls `designLint()`. The key is `<namespace>/no-opacity-modifier`, and the namespace is `design` unless `designLint({ namespace })` sets another one. Set it to `"error"`, keeping any options the override carries.

Done when a lint run in the worktree reports `no-opacity-modifier` diagnostics. If it reports none, the codebase is already clean: tell the user and stop.

### 3. Collect

Run the project's own linter with JSON output from the worktree. A non-zero exit is expected.

```sh
npx oxlint -f json > $W/lint.json          # or: npx eslint -f json . > $W/lint.json
python3 $SKILL/scripts/collect.py --lint $W/lint.json --format oxlint|eslint \
  --repo <worktree> --tokens <tokenFiles from the designLint() call> --out $W
```

Done when collect.py's hit count equals the linter's `no-opacity-modifier` count, with nothing skipped, and it names the `@theme inline` block new tokens go into. If it finds no inline block, show the user where their colors are defined and ask to add `@theme inline {}` there. A token on `:root` or in a plain `@theme` resolves once at the root and stays light inside a `.dark` wrapper; an inline token resolves where it is used, just like `/N` did.

### 4. Fit the ladders and get them confirmed

```sh
python3 $SKILL/scripts/cluster.py $W
```

For each role, cluster.py tries one to five steps, picked from the round values already in use. It prints how many uses each option keeps unchanged and how many come within reach of a step, and marks a recommendation. It writes `$W/ladders.json` with the recommended steps, a name for each step, `cap` (the snap distance in log-odds, default 1.0) and `top` (how many tokens to create, default 30).

Show the user, for every role:

- its histogram of opacity values
- the recommended steps with their names
- the options either side of it, with their "unchanged" and "within reach" percentages

Ask them to accept each ladder or change the steps, the names, or `top`. Write their answer to `ladders.json`. Every name must be unique across all three roles, because it becomes the token suffix; plan.py stops on a repeated name or on a token that already exists.

Done when the user has explicitly accepted every role's steps and names. Steps 5 and later change hundreds of files, so they wait for this.

### 5. Plan and apply

```sh
python3 $SKILL/scripts/plan.py $W            # prints fixed / remaining and every token with its sources
python3 $SKILL/scripts/apply.py $W <worktree>
```

plan.py leaves a hit as an error when two different opacities of one color on one line, such as a resting state and its hover, would snap to the same step. The state would disappear otherwise. Opacities set at runtime (`/[var(--a)]`) also stay as errors, since no step can be chosen for them. If plan.py stops on a name, rename that step in `ladders.json` and rerun it.

Then lint the worktree again and record the remaining `no-opacity-modifier` count. Run the checks the project's `package.json` defines: typecheck, lint, any design gates. Run the formatter only on files that were already formatted on the base branch, because otherwise it reformats unrelated code and buries the change. Done when the remaining count is known and every check passes. Fix or report any that fail.

### 6. Screenshots (when the repo has Storybook)

Build both sides as static Storybooks, install the screenshot tools once, then diff:

```sh
(cd <original checkout> && npx storybook build -o $W/sb-before --quiet)
(cd <worktree> && npx storybook build -o $W/sb-after --quiet)
npm i --prefix $W/tools playwright pngjs pixelmatch sharp
node $SKILL/scripts/screens.mjs --work $W --before $W/sb-before --after $W/sb-after --repo <worktree> --tools $W/tools
```

screens.mjs finds every story that covers a changed file and renders it on both sides, 1200px wide with animations off. Each capture waits until two consecutive screenshots are identical, because a fixed wait under load catches pages before late content lands. A story that differs is rendered again on the "before" side to prove the difference is real, then re-shot at 2× and cropped around the changed pixels. A story that never settles, or renders differently on its own, is marked flaky and its diff left out. A story that renders before but shows Storybook's error screen after is a **regression**. A story already failing before is set aside as broken. A story that will not load at all, even on a retry, is counted as failed to load and makes no claim either way; rerun the script to cover it. It uses the local Chrome, or `npx playwright install chromium` if Chrome is missing.

Done when it prints its counts and the regression count is zero. For each regression, open the story in the "after" build, find which rewritten class broke it, and fix it or put that class back to its `/N` form. Then rebuild "after" and rerun. If the user wants to keep a regression for now, the report shows it first, flagged. Skip this step for a repo without Storybook; the report then leaves out the screenshot section.

### 7. Report

Write `$W/notes.json` as a list of `{"title", "body"}` findings, with code in backticks. Include:

- which checks ran and their result
- the branch and worktree
- anything specific to this repo, for example a theme file mirrored elsewhere that needs the same tokens

The report reads as a first report on the current state. Leave out earlier attempts and earlier ladders.

```sh
python3 $SKILL/scripts/report.py $W --repo-name <repo> --remaining <count from step 5> --notes $W/notes.json
```

Publish `$W/opacity-tokens.html` as an artifact when the Artifact tool is available; otherwise give the user the file path. The page is self-contained, with images embedded. Each changed story gets a slider, Main / Branch / Diff tabs and a full-size view.

Finish with a summary: errors before → after, how many uses kept their opacity and how many moved to a step, how many stories changed, the report link, and the worktree branch. Commit nothing unless the user asks.

## Changing the ladders afterwards

Edit `$W/ladders.json`, run `git checkout -- .` in the worktree, set the rule to `"error"` again (step 2), then rerun step 5 onward. `hits.json` came from the untouched code, so it stays valid.
