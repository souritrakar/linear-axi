import { encode } from "@toon-format/toon";
import { LinearError } from "./errors.js";

export interface OutputOptions {
  json: boolean;
  full: boolean;
}

const CONTENT_LIMIT = 1200;

function truncate(value: unknown, full: boolean): unknown {
  if (full) return value;
  if (typeof value === "string" && value.length > CONTENT_LIMIT) {
    return `${value.slice(0, CONTENT_LIMIT)}… (truncated, ${value.length} chars total — use --full)`;
  }
  if (Array.isArray(value)) return value.map((item) => truncate(item, full));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, truncate(item, full)]),
    );
  }
  return value;
}

export function printOutput(
  value: Record<string, unknown>,
  options: OutputOptions,
  help: string[] = [],
): void {
  const data = truncate(value, options.full) as Record<string, unknown>;
  if (options.json) {
    process.stdout.write(`${JSON.stringify(help.length ? { ...data, help } : data, null, 2)}\n`);
    return;
  }
  const rendered = encode(data);
  const hints = help.length
    ? `\nhelp[${help.length}]:\n${help.map((line) => `  ${line}`).join("\n")}`
    : "";
  process.stdout.write(`${rendered}${hints}\n`);
}

export function printError(error: unknown, options: OutputOptions): number {
  const known =
    error instanceof LinearError
      ? error
      : new LinearError(error instanceof Error ? error.message : String(error));
  const value: Record<string, unknown> = {
    error: { code: known.code, message: known.message },
  };
  if (known.details !== undefined) value.error = { ...(value.error as object), details: known.details };
  printOutput(value, options, known.help);
  return known.code === "VALIDATION_ERROR" ? 2 : 1;
}
