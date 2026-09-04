import { LinearError } from "./errors.js";

export interface GlobalArgs {
  argv: string[];
  workspace?: string;
  json: boolean;
  full: boolean;
}

export function extractGlobalArgs(input: string[]): GlobalArgs {
  const argv: string[] = [];
  let workspace: string | undefined;
  let json = false;
  let full = false;
  for (let index = 0; index < input.length; index += 1) {
    const arg = input[index]!;
    if (arg === "--workspace") {
      workspace = input[++index];
      if (!workspace) throw new LinearError("--workspace requires a value", "VALIDATION_ERROR");
    } else if (arg.startsWith("--workspace=")) {
      workspace = arg.slice("--workspace=".length);
    } else if (arg === "--json") json = true;
    else if (arg === "--full") full = true;
    else argv.push(arg);
  }
  return { argv, workspace, json, full };
}

export type FlagValues = Record<string, string | string[] | boolean | undefined>;

export function parseFlags(
  args: string[],
  valueFlags: string[],
  booleanFlags: string[] = [],
  repeatFlags: string[] = [],
): { positionals: string[]; flags: FlagValues } {
  const positionals: string[] = [];
  const flags: FlagValues = {};
  const allowed = new Set([...valueFlags, ...booleanFlags]);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const equal = arg.indexOf("=");
    const name = equal === -1 ? arg.slice(2) : arg.slice(2, equal);
    if (!allowed.has(name)) throw new LinearError(`Unknown flag: --${name}`, "VALIDATION_ERROR");
    if (booleanFlags.includes(name)) {
      if (equal !== -1) throw new LinearError(`--${name} takes no value`, "VALIDATION_ERROR");
      flags[name] = true;
      continue;
    }
    const value = equal === -1 ? args[++index] : arg.slice(equal + 1);
    if (value === undefined || value.startsWith("--")) {
      throw new LinearError(`--${name} requires a value`, "VALIDATION_ERROR");
    }
    if (repeatFlags.includes(name)) {
      const current = flags[name];
      flags[name] = [...(Array.isArray(current) ? current : []), value];
    } else if (flags[name] !== undefined) {
      throw new LinearError(`--${name} may only be passed once`, "VALIDATION_ERROR");
    } else flags[name] = value;
  }
  return { positionals, flags };
}

export function value(flags: FlagValues, name: string): string | undefined {
  const item = flags[name];
  return typeof item === "string" ? item : undefined;
}

export function values(flags: FlagValues, name: string): string[] {
  const item = flags[name];
  return Array.isArray(item) ? item : typeof item === "string" ? [item] : [];
}

export function required(flags: FlagValues, name: string): string {
  const item = value(flags, name);
  if (item === undefined || item.length === 0) {
    throw new LinearError(`--${name} is required`, "VALIDATION_ERROR");
  }
  return item;
}

export function onlyOne(positionals: string[], label: string): string {
  if (positionals.length !== 1) {
    throw new LinearError(`${label} requires exactly one argument`, "VALIDATION_ERROR");
  }
  return positionals[0]!;
}
