import type { AllowWarnDeny, OxlintConfig } from "oxlint";

export interface DesignLintOptions {
  /** The stylesheets that define your `--color-*` tokens, relative to `base`. */
  tokenFiles: string[];
  /**
   * The import globs your design-system components come from, written exactly as your code
   * imports them. `[]` when the project has no component library, which turns off
   * `no-component-color-override`.
   */
  componentSources: string[];
  /** The rule prefix in diagnostics and disable comments. Defaults to `"design"`. */
  namespace?: string;
  /** The severity every rule is turned on at. Defaults to `"error"`. */
  severity?: AllowWarnDeny;
  /** The directory `tokenFiles` and the Tailwind engine are resolved from. Defaults to the working directory. */
  base?: string;
}

/** Resolves your design system and returns the Oxlint config that turns the rules on. */
export function designLint(options: DesignLintOptions): Promise<{
  jsPlugins: string[];
  rules: NonNullable<OxlintConfig["rules"]>;
}>;
