import { onlyOne, parseFlags, required, value, values } from "../args.js";
import type { OutputOptions } from "../output.js";
import { printOutput } from "../output.js";
import { LinearClient } from "../graphql.js";
import { LinearError } from "../errors.js";
import { issue, issues, milestones, project, projects, resolveProject } from "../api.js";

function isOpen(item: any): boolean {
  if (item.trashed) return false;
  return !["completed", "canceled", "done", "duplicate"].includes(String(item.state?.type ?? item.status ?? item.state).toLowerCase());
}

export async function workflowCommand(
  command: string,
  args: string[],
  client: LinearClient,
  output: OutputOptions,
): Promise<boolean> {
  if (command === "date-pass") {
    const { positionals, flags } = parseFlags(args, ["project", "today"]);
    if (positionals.length > 1) throw new LinearError("date-pass accepts at most one scope", "VALIDATION_ERROR");
    const scope = value(flags, "project") ?? positionals[0] ?? "all";
    const today = value(flags, "today") ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new LinearError("--today must be YYYY-MM-DD", "VALIDATION_ERROR");
    const owner = scope !== "all" && scope !== "no-project" ? await resolveProject(client, scope) : undefined;
    const projectList = (owner ? [owner] : await projects(client, false)).filter(isOpen);
    const projectTargets = new Map(projectList.map((item) => [item.id, item.targetDate]));
    const issueRows = (await issues(client, true))
      .filter((item) => isOpen(item))
      .filter((item) => scope === "all" || (scope === "no-project" ? !item.project : item.project?.id === owner?.id))
      .map((item) => ({ kind: "issue", id: item.id, identifier: item.identifier, title: item.title, currentDate: item.dueDate, project: item.project?.name, projectTarget: item.project?.targetDate ?? (item.project ? projectTargets.get(item.project.id) : undefined) }))
      .filter((item) => !item.currentDate || item.currentDate < today || (item.projectTarget && item.currentDate > item.projectTarget))
      .map((item) => ({ ...item, flag: !item.currentDate ? "undated" : item.currentDate < today ? "overdue" : "inconsistent" }));
    const milestoneRows = scope === "no-project" ? [] : (await milestones(client, true))
      .filter((item) => isOpen(item) && (!owner || item.project?.id === owner.id))
      .map((item) => ({ kind: "milestone", id: item.id, title: item.name, currentDate: item.targetDate, project: item.project?.name, projectTarget: item.project?.targetDate ?? projectTargets.get(item.project?.id) }))
      .filter((item) => !item.currentDate || item.currentDate < today || (item.projectTarget && item.currentDate > item.projectTarget))
      .map((item) => ({ ...item, flag: !item.currentDate ? "undated" : item.currentDate < today ? "overdue" : "inconsistent" }));
    const projectRows = scope === "no-project" ? [] : projectList
      .filter((item) => !item.targetDate || item.targetDate < today)
      .map((item) => ({ kind: "project", id: item.id, title: item.name, currentDate: item.targetDate, flag: !item.targetDate ? "undated" : "overdue" }));
    const rank = new Map([["overdue", 0], ["inconsistent", 1], ["undated", 2]]);
    const flagged = [...projectRows, ...milestoneRows, ...issueRows].sort((a, b) => (rank.get(a.flag) ?? 9) - (rank.get(b.flag) ?? 9));
    printOutput({ scope, today, count: flagged.length, flagged }, output, [
      "Apply issue dates with `linear update-issue <id> --due YYYY-MM-DD`",
      "Apply milestone dates with `linear update-milestone <id> --target YYYY-MM-DD`",
      "Apply project dates with `linear update-project <id> --target YYYY-MM-DD`",
      "Never invent a date; use `linear delete-issue <id>` only after explicit approval",
    ]);
    return true;
  }
  if (command === "project-pass") {
    const { positionals } = parseFlags(args, []);
    if (positionals.length > 1) throw new LinearError("project-pass accepts one project or all", "VALIDATION_ERROR");
    const scope = positionals[0] ?? "all";
    const source = (scope === "all" ? await projects(client, false) : [await resolveProject(client, scope)]).filter(isOpen);
    const rows = [];
    for (const summary of source) {
      const item = await project(client, summary.id);
      const body = String(item.content ?? "");
      const openIssues = item.issues.nodes.filter(isOpen).length;
      const gaps: string[] = [];
      if (!body.trim() || !/^##?\s+Background/im.test(body) || body.length < 240) gaps.push("description");
      if (!String(item.description ?? "").trim()) gaps.push("summary");
      if (!openIssues) gaps.push("issues");
      if (!item.lead) gaps.push("lead");
      if (!item.icon || /^:.*:$/.test(item.icon)) gaps.push("icon");
      rows.push({ id: item.id, project: item.name, summary: item.description, bodyChars: body.length, openIssues, milestones: item.projectMilestones.nodes.length, lead: item.lead?.name, icon: item.icon, initiatives: item.initiatives.nodes.length, gaps });
    }
    const flagged = rows.filter((item) => item.gaps.length);
    printOutput({ scope, count: rows.length, flaggedCount: flagged.length, projects: rows }, output, [
      "Repair fields with `linear update-project <id> ...`",
      "Use the `new-project` skill for missing facts, milestones, or issues",
      "Target dates belong to `linear date-pass`",
    ]);
    return true;
  }
  if (command === "reflect-progress") {
    const { positionals, flags } = parseFlags(args, ["project"]);
    if (positionals.length) throw new LinearError("reflect-progress takes no positional arguments", "VALIDATION_ERROR");
    const owner = await resolveProject(client, required(flags, "project"));
    const data = await client.query<{ project: any }>(
      `query Reflection($id: String!) { project(id: $id) {
        id name url description content updatedAt targetDate state
        issues(first: 250, includeArchived: true) { nodes {
          id identifier title description updatedAt completedAt url state { name type }
          attachments { nodes { id title url sourceType } }
        } }
      } }`, { id: owner.id },
    );
    const rows = data.project.issues.nodes.map((item: any) => ({
      identifier: item.identifier, title: item.title, state: item.state.name,
      updatedAt: item.updatedAt, completedAt: item.completedAt,
      prLinks: item.attachments.nodes.filter((link: any) => /github\.com\/.*\/pull\//.test(link.url)).map((link: any) => link.url),
      url: item.url,
    }));
    printOutput({ project: { id: data.project.id, name: data.project.name, state: data.project.state, targetDate: data.project.targetDate, updatedAt: data.project.updatedAt, url: data.project.url }, issueCount: rows.length, issues: rows }, output, [
      "Use `gh-axi pr list --state all` in each relevant repository for ground truth",
      "Backfill with `linear create-issue ... --state Done --due YYYY-MM-DD`",
      "Integration-link PRs by adding `Part of <identifier>` to the PR body through gh-axi",
      "Fetch stored text before each update because Linear normalizes markdown",
    ]);
    return true;
  }
  if (command === "link-repos") {
    const { positionals, flags } = parseFlags(args, ["repo"], [], ["repo"]);
    const current = await issue(client, onlyOne(positionals, "link-repos"));
    const repos = values(flags, "repo");
    if (!repos.length) {
      printOutput({ issue: { identifier: current.identifier, title: current.title, url: current.url }, existing: current.attachments.nodes }, output, ["After approval run `linear link-repos <id> --repo <url>`"]);
      return true;
    }
    for (const repo of repos) {
      try { new URL(repo); } catch { throw new LinearError(`Invalid repo URL: ${repo}`, "VALIDATION_ERROR"); }
      await client.query(
        "mutation LinkRepo($input: AttachmentCreateInput!) { attachmentCreate(input: $input) { success } }",
        { input: { issueId: current.id, title: repo.replace(/^https?:\/\//, "").replace(/\/$/, ""), url: repo } },
      );
    }
    const verified = await issue(client, String(current.id));
    printOutput({ linked: repos.length, issue: current.identifier, attachments: verified.attachments.nodes }, output);
    return true;
  }
  return false;
}
