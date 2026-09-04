import { value, parseFlags, onlyOne } from "../args.js";
import type { OutputOptions } from "../output.js";
import { printOutput } from "../output.js";
import { LinearClient } from "../graphql.js";
import { LinearError } from "../errors.js";
import {
  cycles,
  document,
  documents,
  initiative,
  initiatives,
  issue,
  issues,
  labels,
  milestones,
  project,
  projects,
  projectStatuses,
  resolveProject,
  resolveState,
  resolveTeam,
  resolveUser,
  states,
  teams,
  users,
} from "../api.js";

function contains(value: unknown, query?: string): boolean {
  if (!query) return true;
  return String(value ?? "").toLowerCase().includes(query.toLowerCase());
}

function countOutput(key: string, rows: unknown[], extra: Record<string, unknown> = {}) {
  return { count: rows.length, ...extra, [key]: rows };
}

export async function readCommand(
  command: string,
  args: string[],
  client: LinearClient,
  output: OutputOptions,
): Promise<boolean> {
  if (command === "teams") {
    const { positionals } = parseFlags(args, []);
    if (positionals.length) throw new LinearError("teams takes no arguments", "VALIDATION_ERROR");
    const rows = (await teams(client)).map(({ id, key, name, description }) => ({ id, key, name, description }));
    printOutput(countOutput("teams", rows), output, ["Run `linear states --team <key>`"]);
    return true;
  }
  if (command === "states" || command === "project-statuses") {
    const { positionals, flags } = parseFlags(args, ["team"]);
    if (positionals.length) throw new LinearError(`${command} takes no positional arguments`, "VALIDATION_ERROR");
    const teamArg = value(flags, "team");
    const team = teamArg ? await resolveTeam(client, teamArg) : undefined;
    const source = command === "states" ? await states(client) : await projectStatuses(client);
    const rows = source
      .filter((item) => !team || !item.team || item.team.id === team.id)
      .map(({ id, name, type, color, team: owner }) => ({ id, name, type, color, team: owner?.key }));
    printOutput(countOutput(command === "states" ? "states" : "project_statuses", rows), output, [
      command === "states"
        ? "Run `linear issues --state <name>`"
        : "Run `linear update-project <id> --state <name>`",
    ]);
    return true;
  }
  if (command === "labels") {
    const { positionals, flags } = parseFlags(args, ["query"]);
    if (positionals.length) throw new LinearError("labels takes no positional arguments", "VALIDATION_ERROR");
    const query = value(flags, "query");
    const rows = (await labels(client))
      .filter((item) => contains(item.name, query))
      .map(({ id, name, color, description, team }) => ({ id, name, color, description, team: team?.key }));
    printOutput(countOutput("labels", rows), output, ["Run `linear create-issue ... --label <name>`"]);
    return true;
  }
  if (command === "users") {
    const { positionals, flags } = parseFlags(args, ["team", "query"]);
    if (positionals.length) throw new LinearError("users takes no positional arguments", "VALIDATION_ERROR");
    const teamArg = value(flags, "team");
    const team = teamArg ? await resolveTeam(client, teamArg) : undefined;
    let source = await users(client);
    if (team) {
      const data = await client.query<{ team: { members: { nodes: any[] } } }>(
        "query Members($id: String!) { team(id: $id) { members(first: 250) { nodes { id name displayName email active isMe } } } }",
        { id: team.id },
      );
      source = data.team.members.nodes;
    }
    const query = value(flags, "query");
    const rows = source
      .filter((item) => contains(`${item.name} ${item.displayName} ${item.email}`, query))
      .map(({ id, name, displayName, email, active, isMe }) => ({ id, name, displayName, email, active, isMe }));
    printOutput(countOutput("users", rows), output);
    return true;
  }
  if (command === "projects") {
    const { positionals, flags } = parseFlags(args, ["team", "query"], ["archived"]);
    if (positionals.length) throw new LinearError("projects takes no positional arguments", "VALIDATION_ERROR");
    const teamArg = value(flags, "team");
    const team = teamArg ? await resolveTeam(client, teamArg) : undefined;
    const query = value(flags, "query");
    const rows = (await projects(client, flags.archived === true))
      .filter((item) => (!team || item.teams.nodes.some((owner: any) => owner.id === team.id)) && contains(`${item.name} ${item.description} ${item.content}`, query))
      .map(({ id, slugId, name, state, targetDate, status, lead, url }) => ({ id, slugId, name, state, status: status?.name, targetDate, lead: lead?.name, url }));
    printOutput(countOutput("projects", rows), output, ["Run `linear project <id>`", "Run `linear create-project --help`"]);
    return true;
  }
  if (command === "project") {
    const { positionals } = parseFlags(args, []);
    const row = await project(client, onlyOne(positionals, "project"));
    printOutput({ project: row }, output, ["Run `linear milestones --project <id>`", "Run `linear issues --project <id>`"]);
    return true;
  }
  if (command === "milestones") {
    const { positionals, flags } = parseFlags(args, ["project"], ["archived"]);
    if (positionals.length) throw new LinearError("milestones takes no positional arguments", "VALIDATION_ERROR");
    const projectArg = value(flags, "project");
    const owner = projectArg ? await resolveProject(client, projectArg) : undefined;
    const rows = (await milestones(client, flags.archived === true))
      .filter((item) => !owner || item.project?.id === owner.id)
      .map(({ id, name, targetDate, progress, status, project: parent }) => ({ id, name, targetDate, progress, status, project: parent?.name }));
    printOutput(countOutput("milestones", rows), output, ["Run `linear create-milestone --help`"]);
    return true;
  }
  if (command === "issues") {
    const { positionals, flags } = parseFlags(args, ["project", "team", "query", "state", "assignee"], ["archived"]);
    if (positionals.length) throw new LinearError("issues takes no positional arguments", "VALIDATION_ERROR");
    const projectArg = value(flags, "project");
    const teamArg = value(flags, "team");
    const owner = projectArg ? await resolveProject(client, projectArg) : undefined;
    const team = teamArg ? await resolveTeam(client, teamArg) : undefined;
    const query = value(flags, "query");
    const stateArg = value(flags, "state");
    const stateEntity = stateArg ? await resolveState(client, stateArg, team?.id) : undefined;
    const assigneeArg = value(flags, "assignee");
    const assigneeEntity = assigneeArg && assigneeArg.toLowerCase() !== "unassigned" ? await resolveUser(client, assigneeArg) : undefined;
    const rows = (await issues(client, flags.archived === true))
      .filter((item) =>
        (!owner || item.project?.id === owner.id) &&
        (!team || item.team?.id === team.id) &&
        contains(`${item.identifier} ${item.title}`, query) &&
        (!stateEntity || item.state?.id === stateEntity.id) &&
        (!assigneeArg || (assigneeArg.toLowerCase() === "unassigned" ? !item.assignee : item.assignee?.id === assigneeEntity?.id))
      )
      .map(({ id, identifier, title, state: status, assignee: ownerUser, dueDate, project: parent, url }) => ({ id, identifier, title, state: status?.name, assignee: ownerUser?.name, dueDate, project: parent?.name, url }));
    printOutput(countOutput("issues", rows), output, ["Run `linear issue <id>`", "Run `linear create-issue --help`"]);
    return true;
  }
  if (command === "issue" || command === "comments") {
    const { positionals } = parseFlags(args, []);
    const row = await issue(client, onlyOne(positionals, command));
    if (command === "issue") printOutput({ issue: row }, output, ["Run `linear comments <id>`", "Run `linear update-issue <id> --help`"]);
    else {
      const rows = row.comments.nodes.map(({ id, body, createdAt, updatedAt, url, user }: any) => ({ id, body, createdAt, updatedAt, user: user?.name, url }));
      printOutput(countOutput("comments", rows, { issue: row.identifier }), output, ["Run `linear comment <id> --body <text>`"]);
    }
    return true;
  }
  if (command === "docs") {
    const { positionals, flags } = parseFlags(args, ["project", "query"], ["archived"]);
    if (positionals.length) throw new LinearError("docs takes no positional arguments", "VALIDATION_ERROR");
    const projectArg = value(flags, "project");
    const owner = projectArg ? await resolveProject(client, projectArg) : undefined;
    const query = value(flags, "query");
    const rows = (await documents(client, flags.archived === true))
      .filter((item) => (!owner || item.project?.id === owner.id) && contains(`${item.title} ${item.content}`, query))
      .map(({ id, slugId, title, updatedAt, project: parent, url }) => ({ id, slugId, title, updatedAt, project: parent?.name, url }));
    printOutput(countOutput("documents", rows), output, ["Run `linear doc <id>`", "Run `linear create-doc --help`"]);
    return true;
  }
  if (command === "doc") {
    const { positionals } = parseFlags(args, []);
    const row = await document(client, onlyOne(positionals, "doc"));
    printOutput({ document: row }, output, ["Run `linear patch-doc <id> --help`"]);
    return true;
  }
  if (command === "cycles") {
    const { positionals, flags } = parseFlags(args, ["team"], ["archived"]);
    if (positionals.length) throw new LinearError("cycles takes no positional arguments", "VALIDATION_ERROR");
    const teamArg = value(flags, "team");
    const team = teamArg ? await resolveTeam(client, teamArg) : undefined;
    const rows = (await cycles(client, flags.archived === true))
      .filter((item) => !team || item.team?.id === team.id)
      .map(({ id, number, name, startsAt, endsAt, progress, isActive, team: owner }) => ({ id, number, name, startsAt, endsAt, progress, isActive, team: owner?.key }));
    printOutput(countOutput("cycles", rows), output);
    return true;
  }
  if (command === "initiatives") {
    const { positionals, flags } = parseFlags(args, ["query"], ["archived"]);
    if (positionals.length) throw new LinearError("initiatives takes no positional arguments", "VALIDATION_ERROR");
    const query = value(flags, "query");
    const rows = (await initiatives(client, flags.archived === true))
      .filter((item) => contains(`${item.name} ${item.description} ${item.content}`, query))
      .map(({ id, slugId, name, status, targetDate, owner, url }) => ({ id, slugId, name, status, targetDate, owner: owner?.name, url }));
    printOutput(countOutput("initiatives", rows), output, ["Run `linear initiative <id>`", "Run `linear create-initiative --help`"]);
    return true;
  }
  if (command === "initiative") {
    const { positionals } = parseFlags(args, []);
    const row = await initiative(client, onlyOne(positionals, "initiative"));
    printOutput({ initiative: row }, output, ["Run `linear update-initiative <id> --help`"]);
    return true;
  }
  return false;
}
