#!/usr/bin/env python3
"""Normalise no-opacity-modifier diagnostics and the theme's colour tokens into hits.json.

usage: collect.py --lint <lint.json> --format oxlint|eslint --repo <dir> --tokens <css>... --out <work dir>

Reads the JSON a linter run produced (`oxlint -f json`, `eslint -f json`), keeps the
no-opacity-modifier reports, and records for each one the exact byte span of the class in
its file, the utility, the colour, the alpha and the role (surface / line / text). Token
stylesheets are followed through relative @imports to find every `--color-*` and the
`@theme inline` block new tokens will go into.
"""
import argparse, json, os, re, sys, collections as C

# Longest prefix first, so `border-t-…` is not read as `border-…` and `ring-offset-…` not as `ring-…`.
UTILS = ["inset-shadow", "ring-offset", "placeholder", "decoration", "border-x", "border-y", "border-t",
         "border-r", "border-b", "border-l", "border-s", "border-e", "outline", "divide", "shadow", "stroke",
         "border", "accent", "caret", "fill", "from", "text", "ring", "via", "bg", "to"]
ROLE = {"bg": "surface", "from": "surface", "via": "surface", "to": "surface", "fill": "surface",
        "shadow": "surface", "inset-shadow": "surface",
        "text": "text", "placeholder": "text", "caret": "text", "accent": "text"}  # everything else: line
UTIL_RE = re.compile(r"^(!?-?)(" + "|".join(re.escape(u) for u in UTILS) + r")-(.+)$")


def parse_alpha(alpha):
    """Percent for `50`, `[0.5]`, `[50%]`; None for a value only the browser knows (`[var(--a)]`)."""
    try:
        if alpha.startswith("["):
            inner = alpha[1:-1]
            return round(float(inner[:-1]) if inner.endswith("%") else float(inner) * 100, 2)
        return round(float(alpha), 2)
    except ValueError:
        return None


def base_of(cls):
    """The class without its variants: text after the last `:` outside brackets."""
    depth, cut = 0, 0
    for i, ch in enumerate(cls):
        depth += {"[": 1, "]": -1, "(": 1, ")": -1}.get(ch, 0)
        if ch == ":" and depth == 0:
            cut = i + 1
    return cls[cut:]


def read_tokens(paths, repo):
    """Every --color-* defined in an @theme block, following relative @imports."""
    seen, tokens, inline_counts = set(), {}, C.Counter()
    def walk(path):
        path = os.path.normpath(path)
        if path in seen or not os.path.exists(path):
            return
        seen.add(path)
        css = open(path, encoding="utf-8").read()
        for imp in re.findall(r'@import\s+["\'](\.[^"\']+)["\']', css):
            walk(os.path.join(os.path.dirname(path), imp))
        for m in re.finditer(r"@theme(\s+[\w\s]*)?\{", css):
            inline = "inline" in (m.group(1) or "")
            depth, i = 1, m.end()
            while depth and i < len(css):
                depth += {"{": 1, "}": -1}.get(css[i], 0); i += 1
            body = css[m.end():i - 1]
            found = re.findall(r"--color-([\w-]+)\s*:\s*([^;]+);", body)
            if inline:
                inline_counts[os.path.relpath(path, repo)] += len(found) + 1
            for name, value in found:
                value = value.strip()
                if value == "initial" or "*" in name:
                    continue
                # An inline token is substituted where it is used, so its value can be copied.
                # A plain @theme token is a real custom property; reference it instead.
                tokens[name] = value if inline else f"var(--color-{name})"
    for p in paths:
        walk(os.path.join(repo, p))
    # New tokens join the inline block that already maps the most colours.
    return tokens, (inline_counts.most_common(1)[0][0] if inline_counts else None)


def spans(diag, fmt, repo, cache):
    """(file, byte offset, byte length, line) for one diagnostic."""
    if fmt == "oxlint":
        lab = diag["labels"][0]["span"]
        return diag["filename"], lab["offset"], lab["length"], lab["line"]
    path, m = diag
    if path not in cache:
        cache[path] = open(os.path.join(repo, path), encoding="utf-8").read().split("\n")
    lines = cache[path]
    def byte_at(line, col):  # ESLint: 1-based line, 1-based UTF-16 column
        head = "\n".join(lines[: line - 1]) + ("\n" if line > 1 else "")
        text = lines[line - 1]
        units, idx = 0, 0
        while units < col - 1 and idx < len(text):
            units += 2 if ord(text[idx]) > 0xFFFF else 1; idx += 1
        return len((head + text[:idx]).encode("utf-8"))
    a = byte_at(m["line"], m["column"])
    b = byte_at(m.get("endLine", m["line"]), m.get("endColumn", m["column"]))
    return path, a, b - a, m["line"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lint", required=True)
    ap.add_argument("--format", choices=["oxlint", "eslint"], required=True)
    ap.add_argument("--repo", required=True)
    ap.add_argument("--tokens", nargs="+", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    repo = os.path.abspath(a.repo)
    raw = json.load(open(a.lint))
    if a.format == "oxlint":
        diags = [d for d in raw["diagnostics"] if d["code"].endswith("(no-opacity-modifier)")]
        other = C.Counter(d["code"] for d in raw["diagnostics"] if d not in diags)
        msg = lambda d: d["message"]
    else:
        diags = [(os.path.relpath(f["filePath"], repo), m) for f in raw for m in f["messages"]
                 if (m.get("ruleId") or "").endswith("/no-opacity-modifier")]
        other = C.Counter(m.get("ruleId") for f in raw for m in f["messages"]
                          if not (m.get("ruleId") or "").endswith("/no-opacity-modifier"))
        msg = lambda d: d[1]["message"]
    tokens, inline_block = read_tokens(a.tokens, repo)
    cache, hits, skipped = {}, [], 0
    for d in diags:
        text = msg(d)
        cls = text.split(" — ")[0]
        file, off, length, line = spans(d, a.format, repo, cache)
        written = open(os.path.join(repo, file), "rb").read()[off:off + length].decode("utf-8", "replace")
        # Tailwind v4 writes important as a suffix (`bg-x/50!`); the leading form is matched by UTIL_RE.
        base_mod = base_of(cls).removesuffix("!")
        mm = UTIL_RE.match(base_mod.rsplit("/", 1)[0]) if "/" in base_mod else None
        if written != cls or not mm:
            skipped += 1
            continue
        alpha = base_mod.rsplit("/", 1)[1]
        util, color = mm.group(2), mm.group(3)
        hits.append(dict(file=file, off=off, len=length, line=line, cls=cls, util=util, color=color,
                         alpha=alpha, v=parse_alpha(alpha), role=ROLE.get(util, "line"), semantic=color in tokens,
                         noop="changes nothing" in text))
    os.makedirs(a.out, exist_ok=True)
    json.dump(dict(hits=hits, tokens=tokens, inlineBlock=inline_block, otherRules=dict(other)),
              open(os.path.join(a.out, "hits.json"), "w"), indent=1)
    print(f"{len(hits)} opacity-modifier hits in {len({h['file'] for h in hits})} files"
          + (f" ({skipped} skipped: span did not match the reported class)" if skipped else ""))
    print(f"{len(tokens)} colour tokens; new tokens go into: {inline_block or 'NO @theme inline block found'}")
    for role in ("surface", "line", "text"):
        c = C.Counter(h["v"] for h in hits if h["role"] == role and h["v"] is not None)
        print(f"  {role:8} {sum(c.values()):5}  " + " ".join(f"{v:g}:{n}" for v, n in sorted(c.items())))
    print(f"  non-theme colours: {sum(not h['semantic'] for h in hits)}   /100 no-ops: {sum(h['noop'] for h in hits)}"
          f"   variable alphas: {sum(h['v'] is None for h in hits)}")


if __name__ == "__main__":
    sys.exit(main())
