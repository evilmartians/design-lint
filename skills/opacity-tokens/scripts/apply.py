#!/usr/bin/env python3
"""Rewrite the planned classes and add the new tokens to the theme.

usage: apply.py <work dir> <repo dir>

Edits each file at the exact byte span the linter reported, checking the span still holds the
reported class (a file edited since the lint run is skipped, not corrupted). Tokens go into
the `@theme inline` block that already maps the most colours: an inline token is substituted
where it is used, so it follows a `.dark` subtree the way `/N` did. With no inline block in
the token files it stops and asks for one. Writes applied.json.
"""
import json, os, sys, collections as C


def main():
    work, repo = sys.argv[1], os.path.abspath(sys.argv[2])
    plan = json.load(open(os.path.join(work, "plan.json")))
    if not plan["inlineBlock"]:
        sys.exit("No @theme inline block in the token files: add one (`@theme inline {}`) to the stylesheet "
                 "that defines your colours, then re-run collect.py.")
    by_file = C.defaultdict(list)
    for h in plan["hits"]:
        if h["reason"] == "fixed":
            by_file[h["file"]].append(h)
    applied, stale = [], 0
    for f, hs in by_file.items():
        path = os.path.join(repo, f)
        data = open(path, "rb").read()
        for h in sorted(hs, key=lambda h: -h["off"]):
            if data[h["off"]:h["off"] + h["len"]].decode("utf-8", "replace") != h["cls"]:
                stale += 1
                continue
            data = data[:h["off"]] + h["new"].encode() + data[h["off"] + h["len"]:]
            applied.append(h)
        open(path, "wb").write(data)

    lad = plan["ladders"]
    lines = ["", "  /* Translucent steps of theme colours (design/no-opacity-modifier).",
             "     One ladder per role, each with its own names:"]
    for role, uses in (("surface", "bg, gradients"), ("line", "border, ring, divide"), ("text", "text, placeholder")):
        if lad.get(role):
            lines.append(f"       {role:8} " + " · ".join(f"{n} {s:g}" for s, n in lad[role]) + f"   ({uses})")
    lines.append("     Inline, so each resolves where it is used and follows a `.dark` subtree. */")
    for t in sorted(plan["newTokens"], key=lambda t: t["token"]):
        lines.append(f"  --color-{t['token']}: color-mix(in oklab, {t['value']} {t['step']:g}%, transparent);")
    block = plan["inlineBlock"]
    css_path = os.path.join(repo, block)
    css = open(css_path, encoding="utf-8").read()
    depth, i = 0, css.index("{", css.index("@theme inline"))
    while True:
        depth += {"{": 1, "}": -1}.get(css[i], 0)
        if depth == 0:
            break
        i += 1
    css = css[:i].rstrip("\n") + "\n" + "\n".join(lines) + "\n" + css[i:]
    open(css_path, "w", encoding="utf-8").write(css)
    json.dump(applied, open(os.path.join(work, "applied.json"), "w"), indent=1)
    print(f"rewrote {len(applied)} classes in {len(by_file)} files; {len(plan['newTokens'])} tokens added to {block}"
          + (f"; {stale} skipped (file changed since the lint run — re-run collect.py)" if stale else ""))


if __name__ == "__main__":
    main()
