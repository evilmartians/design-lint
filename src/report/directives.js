/**
 * Disable comments, as the report counts them.
 *
 * Suppression is the runner's, not ours: Oxlint honours `oxlint-disable*` and
 * `eslint-disable*` alike, so both spellings are counted. Only the comment opener is
 * matched, not a full JavaScript tokenizer — a scanner that tracks strings, templates and
 * regex literals can lose its place on one odd literal and then miscount everything after
 * it, while a directive written inside a string is rare enough not to be worth that risk.
 */

const KINDS = "disable(?:-next-line|-line)?";

const BLOCK = new RegExp(String.raw`\/\*\s*(?:eslint|oxlint)-(${KINDS})(?=\s|\*\/)([\s\S]*?)\*\/`, "g");
const LINE = new RegExp(String.raw`\/\/[ \t]*(?:eslint|oxlint)-(${KINDS})(?=\s|$)(.*)$`, "gm");

/**
 * Every disable directive in a file.
 *
 * @param {string} text the file's source
 * @returns {{ kind: "disable" | "disable-line" | "disable-next-line", rules: string[], line: number }[]}
 *   `rules` is empty when the comment names none, which silences every rule.
 */
export function parseDirectives(text) {
  const found = [];
  for (const pattern of [BLOCK, LINE]) {
    for (const match of text.matchAll(pattern)) {
      found.push({ kind: match[1], rules: ruleList(match[2]), line: lineAt(text, match.index) });
    }
  }
  return found.sort((a, b) => a.line - b.line);
}

/** `a, b -- why` → `["a", "b"]`. Everything after ` -- ` is a description. */
function ruleList(body) {
  return body
    .split(/\s--\s|\s--$/)[0]
    .split(",")
    .map((rule) => rule.trim())
    .filter(Boolean);
}

function lineAt(text, index) {
  let line = 1;
  for (let i = text.indexOf("\n"); i !== -1 && i < index; i = text.indexOf("\n", i + 1)) line++;
  return line;
}
