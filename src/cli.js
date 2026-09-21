#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import { buildReport, renderReport } from "./report/index.js";

const USAGE = `Usage: design-lint report [-c <oxlint config>] [PATH]...

Prints what a project's design-lint setup leaves unchecked: design rules that are off,
disable comments that silence them, and the config's ignorePatterns.

Run it from where you run oxlint, with the same config and paths.

  -c, --config <file>  Oxlint config to read (default: oxlint.config.ts, as oxlint finds it)
  -h, --help           Show this help`;

/**
 * The script configs Oxlint auto-discovers — measured: it picks up these two and ignores
 * `.js` and `.mjs`. A `.oxlintrc.json` cannot run design-lint, because the rules need
 * `designLint()` to have resolved the design system first, so it is not looked for.
 */
const CONFIG_NAMES = ["oxlint.config.ts", "oxlint.config.mts"];

async function main(argv) {
  const [command, ...rest] = argv;
  if (command === "-h" || command === "--help" || command === undefined) {
    console.log(USAGE);
    return command === undefined ? 1 : 0;
  }
  if (command !== "report") {
    console.error(`design-lint: unknown command "${command}".\n\n${USAGE}`);
    return 1;
  }

  const { config: configArg, paths, help } = parseArgs(rest);
  if (help) {
    console.log(USAGE);
    return 0;
  }

  const cwd = process.cwd();
  const configPath = configArg
    ? resolveFrom(cwd, configArg)
    : CONFIG_NAMES.map((name) => join(cwd, name)).find((path) => existsSync(path));
  if (!configPath || !existsSync(configPath)) {
    throw new Error(
      configArg
        ? `design-lint: the config ${configArg} does not exist.`
        : `design-lint: no ${CONFIG_NAMES[0]} in ${cwd}. Run the report from where you run oxlint, or pass --config.`,
    );
  }

  const module = await import(pathToFileURL(configPath).href);
  const config = module.default ?? {};

  // Oxlint decides which files it lints — .gitignore, ignorePatterns, nested configs — so it
  // is asked rather than imitated. A comment in a file Oxlint never opens silences nothing.
  const files = lintedFiles(cwd, [...(configArg ? ["-c", configArg] : []), ...paths]).map((path) => ({
    path,
    text: readFileSync(resolveFrom(cwd, path), "utf-8"),
  }));

  process.stdout.write(
    renderReport(buildReport({ config, files }), { configPath: relative(cwd, configPath) }),
  );
  return 0;
}

function parseArgs(args) {
  const parsed = { config: undefined, paths: [], help: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") parsed.help = true;
    else if (arg === "-c" || arg === "--config") parsed.config = args[++i];
    else if (arg.startsWith("--config=")) parsed.config = arg.slice("--config=".length);
    else if (arg.startsWith("-c=")) parsed.config = arg.slice("-c=".length);
    else if (arg.startsWith("-")) throw new Error(`design-lint: unknown option "${arg}".\n\n${USAGE}`);
    else parsed.paths.push(arg);
  }
  if (parsed.config === undefined && args.some((arg) => arg === "-c" || arg === "--config")) {
    throw new Error("design-lint: --config needs a file.");
  }
  return parsed;
}

/** The files `oxlint [args]` would lint from `cwd`, as Oxlint itself lists them. */
function lintedFiles(cwd, args) {
  const bin = oxlintBin(cwd);
  let output;
  try {
    output = execFileSync(process.execPath, [bin, "--debug=files", ...args], {
      cwd,
      encoding: "utf-8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    // Oxlint prints a config it cannot load on stdout, not stderr.
    const detail = [error.stdout, error.stderr].filter(Boolean).join("\n").trim() || error.message;
    throw new Error(`design-lint: oxlint could not list the files it lints:\n${detail}`);
  }
  return output.split("\n").map((line) => line.trim()).filter(Boolean);
}

/** The project's own oxlint, found by walking up from `cwd` as Node would. */
function oxlintBin(cwd) {
  for (let dir = cwd; ; dir = dirname(dir)) {
    const manifest = join(dir, "node_modules", "oxlint", "package.json");
    if (existsSync(manifest)) {
      const { bin } = JSON.parse(readFileSync(manifest, "utf-8"));
      return join(dirname(manifest), typeof bin === "string" ? bin : bin.oxlint);
    }
    if (dirname(dir) === dir) {
      throw new Error(`design-lint: cannot find oxlint from ${cwd}. Install it: npm install --save-dev oxlint`);
    }
  }
}

function resolveFrom(cwd, path) {
  return isAbsolute(path) ? path : join(cwd, path);
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(error.message);
    process.exitCode = 1;
  },
);
