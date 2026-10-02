#!/usr/bin/env python3
"""Build the standalone HTML report from the work directory.

usage: report.py <work dir> --repo-name <name> --remaining <n> [--notes notes.json] [--out report.html]

Reads plan.json, applied.json and, when screens.mjs ran, shots.json and img/. `--remaining` is
the no-opacity-modifier count from a lint run after apply.py. notes.json is a list of
{"title", "body"} findings appended after the generated ones; wrap code in backticks.
Images are embedded as data URIs, so the page is one self-contained file.
"""
import argparse, base64, json, os, collections as C

HERE = os.path.dirname(os.path.abspath(__file__))


def alpha_key(a):
    return float(a[1:-1].rstrip("%")) * (1 if a.endswith("%]") else 100) if a.startswith("[") else float(a)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("work")
    ap.add_argument("--repo-name", required=True)
    ap.add_argument("--remaining", type=int, required=True)
    ap.add_argument("--notes")
    ap.add_argument("--out")
    a = ap.parse_args()
    W = a.work
    plan = json.load(open(os.path.join(W, "plan.json")))
    hits, lad = plan["hits"], plan["ladders"]
    shots_path = os.path.join(W, "shots.json")
    shots = json.load(open(shots_path)) if os.path.exists(shots_path) else []
    values = {t["token"]: t["value"] for t in plan["newTokens"]}
    R = C.Counter(h["reason"] for h in hits)

    roles = []
    for role in ("surface", "line", "text"):
        rh = [h for h in hits if h["role"] == role and h["semantic"] and not h["noop"]]
        if not lad.get(role) or not rh:
            continue
        steps = []
        for s, n in lad[role]:
            hs = [h for h in rh if h["name"] == n]
            steps.append(dict(step=s, name=n, total=len(hs), exact=sum(h["v"] == s for h in hs),
                              absorbs=sorted({h["alpha"] for h in hs}, key=alpha_key)))
        roles.append(dict(role=role, total=len(rh), onLadder=sum(1 for h in rh if h["name"] or h["reason"] == "collision"),
                          dist=sorted(C.Counter(h["alpha"] for h in rh).items(), key=lambda t: alpha_key(t[0])), steps=steps))

    pairs = []
    for c, n in plan["top"]:
        hs = [h for h in hits if (h["color"], h["name"]) == (c, n) and h["reason"] == "fixed"]
        step = hs[0]["step"]
        first = next((h for h in hs if ":" not in h["cls"]), hs[0])
        pairs.append(dict(token=f"{c}-{n}", color=c, name=n, step=step, role=hs[0]["role"], value=values[f"{c}-{n}"],
                          hits=len(hs), exact=sum(h["v"] == step for h in hs), files=len({h["file"] for h in hs}),
                          state=sum(":" in h["cls"] for h in hs),
                          src=dict(sorted(C.Counter(h["alpha"] for h in hs).items(), key=lambda t: alpha_key(t[0]))),
                          utils=dict(C.Counter(h["util"] for h in hs).most_common(4)),
                          example=dict(**{"from": first["cls"]}, to=first["new"])))

    applied_path = os.path.join(W, "applied.json")
    applied = json.load(open(applied_path)) if os.path.exists(applied_path) else [h for h in hits if h["reason"] == "fixed"]
    snapped = [dict(cls=h["cls"], new=h["new"], file=h["file"]) for h in applied if not h["noop"] and h["step"] != h["v"]]
    rem = [h for h in hits if h["reason"] != "fixed"]
    collisions = [dict(cls=h["cls"], file=h["file"]) for h in hits if h["reason"] == "collision"]

    notes = [dict(title="Where the opacity already matched a step, the token renders identically.",
                  body="Tailwind emits the same `color-mix()` for a token defined at N% as for a `/N` modifier, with the same `@supports` fallback. Pixel changes come only from values that moved to a step.")]
    if collisions:
        notes.append(dict(title="Resting and hover states can merge.",
                          body=f"{len(collisions)} uses were held back because two opacities of one color on one line, such as a resting value and its hover, would land on the same step and the state would disappear. They are listed under Errors and point to a missing concept, such as a hover step."))
    notes.append(dict(title="The tokens live in `@theme inline`.",
                      body="An inline token is substituted where it is used, so it follows a `.dark` class on a wrapper element. A token defined on `:root` would resolve once at the root and stay light inside it."))
    broken = [s["title"] for s in shots if s.get("broken")]
    if broken:
        notes.append(dict(title=f"{len(broken)} {'story fails' if len(broken) == 1 else 'stories fail'} to render in both builds.",
                          body=", ".join(broken) + ". They are left out of the counts."))
    flaky = [s["title"] for s in shots if s.get("flaky")]
    if flaky:
        notes.append(dict(title=f"{len(flaky)} {'story renders' if len(flaky) == 1 else 'stories render'} differently on every run.",
                          body=", ".join(flaky) + ". Their diffs are left out because they would show noise, not the change."))
    if a.notes:
        notes += json.load(open(a.notes))

    data = dict(
        meta=dict(repo=a.repo_name, rule="design/no-opacity-modifier", tokenFile=plan["inlineBlock"]),
        before=len(hits), after=a.remaining, cap=lad.get("cap", 1.0), reasons=R, roles=roles, pairs=pairs,
        remByColor=C.Counter(h["color"] for h in rem).most_common(12),
        remDirs=C.Counter("/".join(h["file"].split("/")[:3]) for h in rem).most_common(10),
        nextPairs=[[f"{c}-{n}", v] for (c, n), v in C.Counter((h["color"], h["name"]) for h in rem if h["reason"] == "not-top").most_common(10)],
        collisions=collisions, snapped=snapped, stateSnapped=sum(":" in s["cls"] for s in snapped),
        files=len({h["file"] for h in applied}), shots=shots, notes=notes)

    img_dir = os.path.join(W, "img")
    imgs = {}
    if os.path.isdir(img_dir):
        for f in os.listdir(img_dir):
            imgs[f] = "data:image/webp;base64," + base64.b64encode(open(os.path.join(img_dir, f), "rb").read()).decode()
    page = open(os.path.join(HERE, "..", "assets", "report.html"), encoding="utf-8").read()
    page = (page.replace("__TITLE__", f"{a.repo_name} Opacity Tokens")
                .replace("__DATA__", json.dumps(data).replace("</", "<\\/"))
                .replace("__IMGS__", json.dumps(imgs)))
    out = a.out or os.path.join(W, "opacity-tokens.html")
    open(out, "w", encoding="utf-8").write(page)
    print(f"{out} ({os.path.getsize(out) // 1024} KB)")


if __name__ == "__main__":
    main()
