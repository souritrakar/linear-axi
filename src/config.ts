import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { LinearError } from "./errors.js";

export const CONFIG_DIR = join(homedir(), ".config", "linear-axi");
export const PROFILE_DIR = join(CONFIG_DIR, "profiles");
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface Config {
  workspace?: string;
}

export function readConfig(): Config {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as Config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw new LinearError(`Could not read ${CONFIG_FILE}`, "CONFIG_ERROR");
  }
}

export function setWorkspace(workspace: string): void {
  validateWorkspace(workspace);
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(CONFIG_FILE, `${JSON.stringify({ ...readConfig(), workspace }, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(CONFIG_FILE, 0o600);
}

export function resolveAuth(workspaceOverride?: string): { key: string; workspace: string } {
  const workspace = workspaceOverride ?? readConfig().workspace;
  const envKey = process.env.LINEAR_API_KEY?.trim();
  if (envKey) return { key: envKey, workspace: workspace ?? "env" };
  if (!workspace) {
    throw new LinearError("No Linear workspace selected", "AUTH_ERROR", [
      "Run `linear use <workspace>`",
      "Or pass `--workspace <workspace>`",
      "Or set `LINEAR_API_KEY`",
    ]);
  }
  validateWorkspace(workspace);
  const profile = join(PROFILE_DIR, `${workspace}.key`);
  try {
    const key = readFileSync(profile, "utf8").trim();
    if (!key) throw new Error("empty");
    return { key, workspace };
  } catch {
    throw new LinearError(`No readable API key for workspace ${workspace}`, "AUTH_ERROR", [
      `Create ${profile} with mode 600`,
      "Or set `LINEAR_API_KEY`",
    ]);
  }
}

export function validateWorkspace(value: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) {
    throw new LinearError(`Invalid workspace name: ${value}`, "VALIDATION_ERROR");
  }
}
