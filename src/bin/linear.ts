#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { setWorkspace, resolveAuth, readConfig } from "../config.js";
import { extractGlobalArgs, onlyOne, parseFlags } from "../args.js";
import { LinearClient } from "../graphql.js";
import { LinearError } from "../errors.js";
import { printError, printOutput, type OutputOptions } from "../output.js";
import { readCommand } from "../commands/read.js";
import { writeCommand } from "../commands/write.js";
import { workflowCommand } from "../commands/workflows.js";
import { commandHelp, topHelp } from "../help.js";

const VERSION = "0.1.0";

function displayPath(path: string): string {
  const home = homedir();
  return path.startsWith(`${home}/`) ? `~/${path.slice(home.length + 1)}` : path;
}

async function home(client: LinearClient, output: OutputOptions, workspace: string): Promise<void> {
  const data = await client.query<{
    viewer: { name: string; email: string };
    organization: { name: string; urlKey: string };
    teams: { nodes: unknown[] };
    projects: { nodes: unknown[] };
    issues: { nodes: unknown[] };
  }>(`query Home {
    viewer { name email } organization { name urlKey }
    teams(first: 250) { nodes { id } }
    projects(first: 250) { nodes { id } }
    issues(first: 250) { nodes { id } }
  }`);
  printOutput({
    bin: displayPath(realpathSync(process.argv[1]!)),
    description: "Deterministic, token-efficient Linear operations",
    workspace,
    organization: data.organization.urlKey,
    viewer: data.viewer.name,
    counts: { teams: data.teams.nodes.length, projects: data.projects.nodes.length, issuesPage: data.issues.nodes.length },
  }, output, ["Run `linear issues`", "Run `linear projects`", "Run `linear --help`"]);
}

async function main(): Promise<void> {
  let globals;
  try { globals = extractGlobalArgs(process.argv.slice(2)); }
  catch (error) { process.exitCode = printError(error, { json: process.argv.includes("--json"), full: false }); return; }
  const output = { json: globals.json, full: globals.full };
  const [command, ...args] = globals.argv;
  if (command === "--help" || command === "-h") { process.stdout.write(`${topHelp()}\n`); return; }
  if (command === "--version" || command === "-v" || command === "-V") { process.stdout.write(`${VERSION}\n`); return; }
  if (args.includes("--help") || args.includes("-h")) { process.stdout.write(`${commandHelp(command ?? "")}\n`); return; }
  try {
    if (command === "use") {
      const parsed = parseFlags(args, []);
      const workspace = onlyOne(parsed.positionals, "use");
      setWorkspace(workspace);
      printOutput({ workspace, selected: true }, output, [`Run \`linear whoami\``]);
      return;
    }
    const auth = resolveAuth(globals.workspace);
    const client = new LinearClient(auth.key);
    if (!command) { await home(client, output, auth.workspace); return; }
    if (command === "whoami") {
      const parsed = parseFlags(args, []);
      if (parsed.positionals.length) throw new LinearError("whoami takes no arguments", "VALIDATION_ERROR");
      const data = await client.query<{ viewer: Record<string, unknown>; organization: Record<string, unknown> }>(
        "query Whoami { viewer { id name email } organization { id name urlKey } }",
      );
      printOutput({ workspace: auth.workspace, viewer: data.viewer, organization: data.organization }, output, ["Run `linear teams`"]); return;
    }
    if (await readCommand(command, args, client, output)) return;
    if (await writeCommand(command, args, client, output)) return;
    if (await workflowCommand(command, args, client, output)) return;
    throw new LinearError(`Unknown command: ${command}`, "VALIDATION_ERROR", ["Run `linear --help`"]);
  } catch (error) {
    process.exitCode = printError(error, output);
  }
}

await main();
