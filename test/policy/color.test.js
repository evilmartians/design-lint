import { describe, expect, it } from "vitest";

import {
  DEFAULT_IGNORED_VALUES,
  firstRawColor,
  NAMED_COLORS,
  rawColorsIn,
  SYSTEM_COLORS,
  wholeValueColor,
} from "../../src/policy/color.js";

/**
 * The colour matcher, away from any rule.
 *
 * It is shared — `no-raw-color` asks it about four surfaces and `no-style-color`'s
 * `shorthandProperties: "value"` mode will ask it about a fifth — so its behaviour is
 * pinned here rather than only through the contracts that happen to exercise it today. The
 * cases below are grouped by the distinction each one exists to draw, because almost every
 * one of them is a place a single regex gets wrong.
 */

describe("the generated keyword sets", () => {
  // The contract's count, asserted rather than trusted: the list is generated precisely so
  // a partial one cannot slip in, and a generator that quietly produced half a set would
  // otherwise look exactly like a working one.
  it("has all 148 named colours and all 19 system colours", () => {
    expect(NAMED_COLORS.size).toBe(148);
    expect(SYSTEM_COLORS.size).toBe(19);
  });

  it("covers the corners of the named set", () => {
    // The newest name, the two spellings CSS keeps, and the basic set that predates it.
    for (const name of ["rebeccapurple", "aliceblue", "darkgrey", "darkgray", "red", "tomato"]) {
      expect(NAMED_COLORS.has(name)).toBe(true);
    }
  });

  it("keeps the system colours out of the named set", () => {
    expect(NAMED_COLORS.has("buttontext")).toBe(false);
    expect(SYSTEM_COLORS.has("buttontext")).toBe(true);
    expect(SYSTEM_COLORS.has("canvas")).toBe(true);
    expect(SYSTEM_COLORS.has("accentcolor")).toBe(true);
  });

  // `transparent` and `currentcolor` sit in the same table in the source. They are not
  // colours in this rule's sense, and putting them in either set would make every caller
  // subtract them again.
  it("holds neither of the two non-colours", () => {
    for (const set of [NAMED_COLORS, SYSTEM_COLORS]) {
      expect(set.has("transparent")).toBe(false);
      expect(set.has("currentcolor")).toBe(false);
    }
  });
});

describe("rawColorsIn — a value known to carry a colour", () => {
  it("reads hex in every length CSS defines", () => {
    for (const hex of ["#fff", "#ffff", "#ffffff", "#ffffff80"]) {
      expect(rawColorsIn(hex)).toEqual([hex]);
    }
  });

  // `#[0-9a-fA-F]{3,8}\b` would report a seven-digit hex, which is not a colour in any CSS
  // that has shipped.
  it("refuses a hex length that is not a colour", () => {
    for (const notHex of ["#ff", "#fffff", "#1234567", "#fffffffff", "#zz", "#app-root"]) {
      expect(rawColorsIn(notHex)).toEqual([]);
    }
  });

  it("counts a colour function once, as the call", () => {
    expect(rawColorsIn("rgb(255, 0, 0)")).toEqual(["rgb(255, 0, 0)"]);
    expect(rawColorsIn("oklch(0.7 0.15 30)")).toEqual(["oklch(0.7 0.15 30)"]);
    expect(rawColorsIn("color(display-p3 1 0 0)")).toEqual(["color(display-p3 1 0 0)"]);
    expect(rawColorsIn("device-cmyk(0 1 1 0)")).toEqual(["device-cmyk(0 1 1 0)"]);
  });

  // The longest function name has to win, or `color-mix` is read as `color` and every
  // composition becomes an unconditional violation.
  it("does not read color-mix as color", () => {
    expect(rawColorsIn("color-mix(in oklch, var(--a) 50%, transparent)")).toEqual([]);
  });

  it("reads a named colour, and a system one", () => {
    expect(rawColorsIn("red")).toEqual(["red"]);
    expect(rawColorsIn("rebeccapurple")).toEqual(["rebeccapurple"]);
    expect(rawColorsIn("ButtonText")).toEqual(["ButtonText"]);
    expect(rawColorsIn("1px solid darkslategray")).toEqual(["darkslategray"]);
  });

  // Whole scanner tokens, never substrings. Both of these contain the letters of a colour
  // name and neither is one.
  it("never matches a name inside a longer word", () => {
    expect(rawColorsIn("fadeToRed 2s")).toEqual([]);
    expect(rawColorsIn("redish")).toEqual([]);
    expect(rawColorsIn("13px")).toEqual([]);
  });

  it("turns the named half off on request", () => {
    expect(rawColorsIn("red", { namedColors: false })).toEqual([]);
    expect(rawColorsIn("ButtonText", { namedColors: false })).toEqual([]);
    // The unambiguous forms are unaffected — that is what makes this the backstop's reading.
    expect(rawColorsIn("#f00", { namedColors: false })).toEqual(["#f00"]);
  });

  it("stays quiet on the values that are references or cascade operations", () => {
    for (const value of DEFAULT_IGNORED_VALUES) {
      expect(rawColorsIn(value)).toEqual([]);
    }
    // Case-insensitively, because CSS keywords are.
    expect(rawColorsIn("CurrentColor")).toEqual([]);
  });

  it("takes a project's own ignore list", () => {
    expect(rawColorsIn("red", { ignoreValues: ["red"] })).toEqual([]);
    // Removing an entry from the list puts the value back in scope, which is the cost the
    // contract warns about rather than a bug.
    expect(rawColorsIn("transparent", { ignoreValues: [] })).toEqual([]);
  });

  describe("the things that look like colours and are not", () => {
    // Every `#` inside `url()` is a fragment identifier, never a colour.
    it("treats url() as an address", () => {
      expect(rawColorsIn("url(#gradient-primary)")).toEqual([]);
      expect(rawColorsIn("url('/img/hero.png#anchor')")).toEqual([]);
      expect(rawColorsIn("url(#face)")).toEqual([]);
    });

    it("treats var() as the reference it is", () => {
      expect(rawColorsIn("var(--color-primary)")).toEqual([]);
      expect(rawColorsIn("--color-primary")).toEqual([]);
    });

    it("does not read a number or a length as a keyword", () => {
      expect(rawColorsIn("0 0 4px")).toEqual([]);
      expect(rawColorsIn("1fr auto")).toEqual([]);
      expect(rawColorsIn("calc(100% - 2rem)")).toEqual([]);
    });

    it("leaves quoted text alone", () => {
      expect(rawColorsIn(`"Tomato", sans-serif`)).toEqual([]);
    });
  });

  describe("composition", () => {
    // Why `color-mix` and `light-dark` cannot simply join the colour-function set: the
    // mechanism is `no-dark-variant`'s, the literal is this matcher's.
    it("is a colour when an argument is one", () => {
      expect(rawColorsIn("light-dark(#fff,#000)")).toEqual(["light-dark(#fff,#000)"]);
      expect(rawColorsIn("color-mix(in oklch, #fff 50%, #000)")).toEqual([
        "color-mix(in oklch, #fff 50%, #000)",
      ]);
    });

    it("is not a colour when every argument is a reference", () => {
      expect(rawColorsIn("light-dark(var(--a),var(--b))")).toEqual([]);
      expect(rawColorsIn("color-mix(in oklch, var(--color-primary) 50%, transparent)")).toEqual([]);
    });

    it("reports the composition once, not once per argument", () => {
      expect(rawColorsIn("light-dark(#fff,#000)")).toHaveLength(1);
    });
  });

  describe("relative colour syntax, which composes too", () => {
    // `from` is what turns a colour function's first argument from a number into a colour,
    // so the call derives from a token as surely as `color-mix()` does. Without this the
    // whole set of colour functions is unconditional and every derived hover shade reports.
    it("is not a colour when it derives from a reference", () => {
      expect(rawColorsIn("oklch(from var(--accent) calc(l - 0.01) c h)")).toEqual([]);
      expect(rawColorsIn("rgb(from var(--brand) r g b / 0.5)")).toEqual([]);
      expect(rawColorsIn("color(from var(--brand) srgb r g b)")).toEqual([]);
      expect(rawColorsIn("oklch(from color-mix(in oklch, var(--a), var(--b)) l c h)")).toEqual([]);
    });

    it("is a colour when it derives from a literal, and names the whole call", () => {
      expect(rawColorsIn("oklch(from #f00 l c h)")).toEqual(["oklch(from #f00 l c h)"]);
      expect(rawColorsIn("oklch(from red calc(l - 0.01) c h)")).toEqual([
        "oklch(from red calc(l - 0.01) c h)",
      ]);
      expect(rawColorsIn("oklch(from color-mix(in oklch, #fff, var(--b)) l c h)")).toHaveLength(1);
    });

    // The channels are numbers and single letters. No named colour is one letter long, so
    // there is nothing there to read as a colour — but only the origin is scanned, so the
    // question never arises.
    it("reads the origin only, and only when `from` is there", () => {
      expect(rawColorsIn("oklch(0.7 0.15 30)")).toEqual(["oklch(0.7 0.15 30)"]);
      expect(rawColorsIn("OKLCH(FROM var(--a) l c h)")).toEqual([]);
      expect(rawColorsIn("oklch(from var(--a) l c h / 0)")).toEqual([]);
    });
  });

  describe("other functions, which are transparent", () => {
    // A gradient is not a colour and is full of them. This is where a property-name check
    // loses a colour it never had a chance to see.
    it("finds the colours inside a gradient", () => {
      expect(rawColorsIn("linear-gradient(#fff, #000)")).toEqual(["#fff", "#000"]);
    });

    it("finds every colour in a shadow list, in order", () => {
      expect(rawColorsIn("0 0 4px #f00, 0 0 8px #00f")).toEqual(["#f00", "#00f"]);
    });

    it("survives an unbalanced call rather than dropping it", () => {
      expect(rawColorsIn("linear-gradient(#fff")).toEqual(["#fff"]);
    });
  });

  describe("a zero alpha, which is transparent spelled another way", () => {
    it("drops a hex whose alpha digits are zero", () => {
      expect(rawColorsIn("#0000")).toEqual([]);
      expect(rawColorsIn("#00000000")).toEqual([]);
      expect(rawColorsIn("#ff000000")).toEqual([]);
    });

    it("drops a colour function whose alpha is zero, in either syntax", () => {
      expect(rawColorsIn("rgba(0, 0, 0, 0)")).toEqual([]);
      expect(rawColorsIn("rgb(0 0 0 / 0%)")).toEqual([]);
      expect(rawColorsIn("oklch(0.5 0.1 20 / .0)")).toEqual([]);
    });

    it("keeps any alpha above zero, and a colour with no alpha", () => {
      expect(rawColorsIn("#00000001")).toEqual(["#00000001"]);
      expect(rawColorsIn("#0001")).toEqual(["#0001"]);
      expect(rawColorsIn("rgba(0, 0, 0, 0.05)")).toEqual(["rgba(0, 0, 0, 0.05)"]);
      expect(rawColorsIn("rgb(0 0 0)")).toEqual(["rgb(0 0 0)"]);
    });

    it("reads the alpha at the top level only", () => {
      expect(rawColorsIn("oklch(calc(0.5 / 1) 0 0)")).toEqual(["oklch(calc(0.5 / 1) 0 0)"]);
    });
  });

  it("has nothing to say about a non-string", () => {
    expect(rawColorsIn(undefined)).toEqual([]);
    expect(rawColorsIn("")).toEqual([]);
  });
});

describe("firstRawColor", () => {
  // The reading every caller wants: one report per property, per attribute or per class
  // token, however many literals the value holds.
  it("names one value however many the string holds", () => {
    expect(firstRawColor("0 0 4px #f00, 0 0 8px #00f")).toBe("#f00");
  });

  it("is null when there is nothing to name", () => {
    expect(firstRawColor("1px solid var(--color-border)")).toBe(null);
  });
});

describe("wholeValueColor — a string with no context at all", () => {
  it("takes a string that is nothing but a colour", () => {
    expect(wholeValueColor("#ff0000")).toBe("#ff0000");
    expect(wholeValueColor("rgb(200 200 200)")).toBe("rgb(200 200 200)");
    expect(wholeValueColor("  #0a7cff  ")).toBe("#0a7cff");
  });

  // The declared blind spot, as an assertion. Recovering a colour from around it means
  // parsing an embedded grammar, which is out of scope on both surfaces.
  it("refuses a colour spliced into a longer string", () => {
    expect(wholeValueColor("color: #ff0000; padding: 4px")).toBe(null);
    expect(wholeValueColor("<b style='color:#f00'>hi</b>")).toBe(null);
    expect(wholeValueColor("data:image/svg+xml,<svg fill='#ff0000'></svg>")).toBe(null);
    expect(wholeValueColor("linear-gradient(#fff, #000)")).toBe(null);
  });

  // The whole point of the context-scoped model: outside a colour-carrying context there is
  // nothing to say which sense of the word a string means, so it never guesses.
  it("never takes a bare word", () => {
    expect(wholeValueColor("red")).toBe(null);
    expect(wholeValueColor("tomato")).toBe(null);
    expect(wholeValueColor("ButtonText")).toBe(null);
  });

  it("takes one on request, for a caller that has the context", () => {
    expect(wholeValueColor("red", { namedColors: true })).toBe("red");
  });

  it("is not fooled by the strings a codebase is full of", () => {
    for (const value of ["#pricing", "#app-root", "Rules #1 and #2", "#1234567", "p-2"]) {
      expect(wholeValueColor(value)).toBe(null);
    }
  });

  // Accepted noise, stated as a test so nobody "fixes" it: a hex-only identifier is
  // indistinguishable from a colour without context, and `bias: false-positives` takes it.
  it("does take a hex-only fragment identifier, which the contract accepts", () => {
    expect(wholeValueColor("#face")).toBe("#face");
  });
});
