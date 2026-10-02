#!/usr/bin/env python3
"""Fit a small set of opacity steps per role to the alphas in hits.json.

usage: cluster.py <work dir> [--cap 1.0] [--max-k 5]

For each role (surface, line, text) it tries every set of 1..max-k steps drawn from the
alphas actually in use and keeps the set with the least total snap distance. Distance is
measured in log-odds, so 5%→10% costs the same as 90%→95%. Text may only move to a step at
or above its value (contrast never drops). Writes proposals.json and ladders.json (the
recommended set, with default names) and prints a table to show the user.
"""
import argparse, itertools, json, math, os, collections as C

# One vocabulary per role, so names never collide across roles. Each name owns an alpha
# band (upper bound, inclusive): a step is named by where it sits, not by its position.
VOCAB = {
    "surface": [(12, "wash"), (25, "haze"), (60, "veil"), (85, "dense"), (100, "solid")],
    "line": [(20, "hairline"), (35, "faint"), (60, "subtle"), (80, "firm"), (100, "strong")],
    "text": [(55, "faded"), (65, "dim"), (80, "quiet"), (92, "soft"), (100, "crisp")],
}


def logit(v):
    p = min(max(v, 0.5), 99.5) / 100
    return math.log(p / (1 - p))


def dist(v, s, role):
    if role == "text" and s < v:
        return math.inf
    return abs(logit(v) - logit(s))


def candidates(counts):
    # Steps are round numbers already in use: a ladder of 5% increments reads as a decision.
    return sorted({v for v in counts if 0 < v < 100 and v % 5 == 0})


def fit(counts, role, k, cap):
    cands = candidates(counts)
    best = None
    for steps in itertools.combinations(cands, k):
        cost = 0.0
        for v, n in counts.items():
            d = min(dist(v, s, role) for s in steps)
            cost += n * min(d, cap * 2)  # anything past the cap stays behind; bound its weight
        if best is None or cost < best[0]:
            best = (cost, steps)
    steps = list(best[1])
    total = sum(counts.values())
    unchanged = sum(n for v, n in counts.items() if v in steps)
    reach = sum(n for v, n in counts.items() if min(dist(v, s, role) for s in steps) <= cap)
    return dict(steps=steps, unchanged=unchanged, reach=reach, total=total)


def names_for(role, steps):
    """One distinct word per step, each as close to its own band as the others allow."""
    bands, words = VOCAB[role], [w for _, w in VOCAB[role]]
    idx = []
    for s in steps:  # ascending; two steps in one band push the later one up a word
        band = next(i for i, (hi, _) in enumerate(bands) if s <= hi)
        idx.append(max(band, idx[-1] + 1) if idx else band)
    for i in range(len(idx) - 1, -1, -1):  # pushed past the top: slide back down, still distinct
        idx[i] = min(idx[i], len(words) - len(idx) + i)
    return [words[i] for i in idx]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("work")
    ap.add_argument("--cap", type=float, default=1.0)
    ap.add_argument("--max-k", type=int, default=5)
    ap.add_argument("--min-reach", type=float, default=0.9, help="recommended set: share within reach of a step")
    ap.add_argument("--min-unchanged", type=float, default=0.5, help="recommended set: share already on a step")
    a = ap.parse_args()
    hits = json.load(open(os.path.join(a.work, "hits.json")))["hits"]
    proposals, ladders = {}, {"cap": a.cap, "top": 30}
    for role in ("surface", "line", "text"):
        counts = C.Counter(h["v"] for h in hits
                           if h["role"] == role and h["semantic"] and not h["noop"] and h["v"] is not None)
        if not counts:
            continue
        # A ladder has at most one step per round value in use, and one name per word in the vocabulary.
        max_k = min(a.max_k, len(candidates(counts)), len(VOCAB[role]))
        if max_k == 0:
            print(f"\n{role}  ({sum(counts.values())} uses): no round value in use, so no ladder; these stay as errors")
            continue
        options = [fit(counts, role, k, a.cap) for k in range(1, max_k + 1)]
        rec = next((o for o in options if o["reach"] >= a.min_reach * o["total"]
                    and o["unchanged"] >= a.min_unchanged * o["total"]), options[-1])
        proposals[role] = dict(histogram=sorted(counts.items()), options=options, recommended=len(rec["steps"]))
        ladders[role] = [[s, n] for s, n in zip(rec["steps"], names_for(role, rec["steps"]))]
        print(f"\n{role}  ({sum(counts.values())} uses)")
        print("  alphas  " + " ".join(f"{v:g}:{n}" for v, n in sorted(counts.items())))
        for o in options:
            mark = "  ← recommended" if o is rec else ""
            o["names"] = names_for(role, o["steps"])
            print(f"  {len(o['steps'])} steps  {' · '.join(f'{n} {s:g}' for s, n in zip(o['steps'], o['names'])):44}"
                  f" unchanged {o['unchanged'] * 100 // o['total']:3}%   within reach {o['reach'] * 100 // o['total']:3}%{mark}")
    json.dump(proposals, open(os.path.join(a.work, "proposals.json"), "w"), indent=1)
    json.dump(ladders, open(os.path.join(a.work, "ladders.json"), "w"), indent=1)
    print("\nRecommended ladders (edit ladders.json to change steps, names, cap or top):")
    for role in ("surface", "line", "text"):
        if role in ladders:
            print(f"  {role:8} " + " · ".join(f"{n} {s:g}" for s, n in ladders[role]))


if __name__ == "__main__":
    main()
