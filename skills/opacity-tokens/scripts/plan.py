#!/usr/bin/env python3
"""Decide which hits become which token, from hits.json and the confirmed ladders.json.

usage: plan.py <work dir>

Each hit snaps to the nearest step of its role (log-odds distance, at most `cap`; text only
moves up). Two different alphas of one colour, in one role, on one line — a resting state and
its hover — that would land on the same step are both held back, since the state would vanish.
The `top` most-used colour × step pairs become tokens. `/100` no-ops are always fixed by
deleting the modifier. Writes plan.json and prints what will change.
"""
import json, math, os, sys, collections as C


def logit(v):
    p = min(max(v, 0.5), 99.5) / 100
    return math.log(p / (1 - p))


def main():
    work = sys.argv[1]
    src = json.load(open(os.path.join(work, "hits.json")))
    lad = json.load(open(os.path.join(work, "ladders.json")))
    hits, tokens, cap, top_n = src["hits"], src["tokens"], lad.get("cap", 1.0), lad.get("top", 30)

    def snap(v, role):
        steps = [s for s in lad.get(role, []) if role != "text" or s[0] >= v]
        if not steps or not 0 < v < 100:
            return None
        s = min(steps, key=lambda s: (abs(logit(v) - logit(s[0])), -s[0]))
        return s if abs(logit(v) - logit(s[0])) <= cap else None

    for h in hits:
        h["step"] = h["name"] = None
        if h["noop"]:
            h["reason"] = "noop"
            continue
        if not h["semantic"]:
            h["reason"] = "non-semantic"
            continue
        s = snap(h["v"], h["role"])
        if s:
            h["step"], h["name"] = s
        h["reason"] = "candidate" if s else "off-ladder"

    groups = C.defaultdict(list)
    for h in hits:
        groups[(h["file"], h["line"], h["color"], h["role"])].append(h)
    for g in groups.values():
        alphas = C.defaultdict(set)
        for h in g:
            if h["name"]:
                alphas[h["name"]].add(h["v"])
        for h in g:
            if h["name"] and len(alphas[h["name"]]) > 1:
                h["reason"], h["step"], h["name"] = "collision", None, None

    pairs = C.Counter((h["color"], h["name"]) for h in hits if h["reason"] == "candidate")
    top = [list(p) for p, _ in pairs.most_common(top_n)]
    clash = [f"{c}-{n}" for c, n in top if f"{c}-{n}" in tokens]
    if clash:
        sys.exit("These new token names already exist in the theme; rename the step(s) in ladders.json: "
                 + ", ".join(clash))
    chosen = {tuple(p) for p in top}
    for h in hits:
        if h["reason"] == "candidate":
            h["reason"] = "fixed" if (h["color"], h["name"]) in chosen else "not-top"
        if h["reason"] == "noop":
            h["reason"] = "fixed"
            h["new"] = h["cls"].rsplit("/", 1)[0]
        elif h["reason"] == "fixed":
            h["new"] = h["cls"].rsplit("/", 1)[0] + "-" + h["name"]

    step_of = {n: s for role in ("surface", "line", "text") for s, n in lad.get(role, [])}
    new_tokens = [dict(token=f"{c}-{n}", color=c, name=n, step=step_of[n], value=tokens[c]) for c, n in top]
    json.dump(dict(ladders=lad, hits=hits, top=top, newTokens=new_tokens, inlineBlock=src["inlineBlock"]),
              open(os.path.join(work, "plan.json"), "w"), indent=1)
    r = C.Counter(h["reason"] for h in hits)
    fixed = [h for h in hits if h["reason"] == "fixed"]
    print(f"{len(hits)} hits → fixed {r['fixed']} ({sum(h.get('step') == h['v'] or h['noop'] for h in fixed)} unchanged,"
          f" {sum(h.get('step') not in (None, h['v']) for h in fixed)} moved to a step)")
    print("remaining: " + ", ".join(f"{k} {v}" for k, v in r.items() if k != "fixed"))
    for c, n in top:
        hs = [h for h in hits if (h["color"], h["name"]) == (c, n)]
        src_alphas = C.Counter(h["alpha"] for h in hs)
        print(f"  {c}-{n:10} {step_of[n]:>3}%  {len(hs):4}  from " + " ".join(f"/{a}×{k}" for a, k in sorted(src_alphas.items())))


if __name__ == "__main__":
    main()
