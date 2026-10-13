import type { AllowWarnDeny, OxlintConfig } from "oxlint";

interface CommonOptions {
  /** The stylesheets that define your `--color-*` tokens, relative to `base`. */
  tokenFiles: string[];
  /** The rule prefix in diagnostics and disable comments. Defaults to `"design"`. */
  namespace?: string;
  /** The severity every rule is turned on at. Defaults to `"error"`. */
  severity?: AllowWarnDeny;
  /** The directory `tokenFiles` and the Tailwind engine are resolved from. Defaults to the working directory. */
  base?: string;
}

export interface BasicOptions extends CommonOptions {
  /** Enables rules that require only token stylesheets. */
  preset: "basic";
  componentSources?: never;
}

export interface StrictOptions extends CommonOptions {
  /**
   * Default preset. Includes basic rules and checks for token roles, themes, translucent
   * tokens, and component variants.
   */
  preset?: "strict";
  /**
   * The import globs your design-system components come from, written exactly as your code
   * imports them. `[]` when the project has no component library, which turns off
   * `no-component-color-override`.
   */
  componentSources: string[];
}

export type DesignLintOptions = BasicOptions | StrictOptions;

/** Resolves your design system and returns the Oxlint config that turns the rules on. */
export function designLint(options: DesignLintOptions): Promise<{
  jsPlugins: string[];
  rules: NonNullable<OxlintConfig["rules"]>;
}>;
