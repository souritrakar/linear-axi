import { readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { lookup as mimeLookup } from "mime-types";
import { onlyOne, parseFlags, required, value, values, type FlagValues } from "../args.js";
import type { OutputOptions } from "../output.js";
import { printOutput } from "../output.js";
import { LinearClient } from "../graphql.js";
import { LinearError } from "../errors.js";
import {
  document,
  initiative,
  issue,
  project,
  resolveCycle,
  resolveLabels,
  resolveMilestone,
  resolveProject,
  resolveProjectStatus,
  resolveState,
  resolveTeam,
  resolveUser,
} from "../api.js";

type RecordValue = Record<string, unknown>;

function textSource(flags: FlagValues, inline: string, file: string, requiredValue = false): string | undefined {
  const direct = value(flags, inline);
  const path = value(flags, file);
  if (direct !== undefined && path !== undefined) {
    throw new LinearError(`Use only one of --${inline} and --${file}`, "VALIDATION_ERROR");
  }
  let result = direct;
  if (path) {
    try {
      result = readFileSync(resolve(path), "utf8");
    } catch {
      throw new LinearError(`Could not read --${file} path: ${path}`, "VALIDATION_ERROR");
    }
  }
  if (requiredValue && result === undefined) {
    throw new LinearError(`--${inline} or --${file} is required`, "VALIDATION_ERROR");
  }
  return result;
}

function dateValue(raw: string | undefined, clearable: boolean): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === "clear" || raw === "null") {
    if (!clearable) {
      throw new LinearError(
        "Linear cannot clear a project or initiative target date through the API; use the Linear UI",
        "VALIDATION_ERROR",
      );
    }
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new LinearError(`Expected ISO date YYYY-MM-DD, got: ${raw}`, "VALIDATION_ERROR");
  }
  return raw;
}

function intValue(raw: string | undefined, name: string): number | undefined {
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) throw new LinearError(`--${name} must be an integer`, "VALIDATION_ERROR");
  return parsed;
}

function compact(input: RecordValue): RecordValue {
  return Object.fromEntries(Object.entries(input).filter(([, item]) => item !== undefined));
}

function titleForUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    throw new LinearError(`Invalid URL: ${url}`, "VALIDATION_ERROR");
  }
}

async function attachLinks(client: LinearClient, issueId: string, urls: string[]): Promise<RecordValue[]> {
  const attached: RecordValue[] = [];
  for (const url of urls) {
    const data = await client.query<{ attachmentCreate: { success: boolean; attachment: RecordValue } }>(
      `mutation Link($input: AttachmentCreateInput!) {
        attachmentCreate(input: $input) { success attachment { id title url } }
      }`,
      { input: { issueId, title: titleForUrl(url), url } },
    );
    attached.push(data.attachmentCreate.attachment);
  }
  return attached;
}

async function issueInput(
  client: LinearClient,
  flags: FlagValues,
  creating: boolean,
): Promise<{ input: RecordValue; links: string[] }> {
  const teamArg = value(flags, "team");
  const team = teamArg ? await resolveTeam(client, teamArg) : undefined;
  if (creating && !team) throw new LinearError("--team is required", "VALIDATION_ERROR");
  const projectArg = value(flags, "project");
  const project = projectArg ? await resolveProject(client, projectArg) : undefined;
  const milestoneArg = value(flags, "milestone");
  const milestone = milestoneArg ? await resolveMilestone(client, milestoneArg, project?.id) : undefined;
  const assigneeArg = value(flags, "assignee");
  const assignee = assigneeArg ? await resolveUser(client, assigneeArg) : undefined;
  const stateArg = value(flags, "state");
  const state = stateArg ? await resolveState(client, stateArg, team?.id) : undefined;
  const cycleArg = value(flags, "cycle");
  const cycle = cycleArg ? await resolveCycle(client, cycleArg, team?.id) : undefined;
  const labelArgs = values(flags, "label");
  const labelList = labelArgs.length ? await resolveLabels(client, labelArgs) : undefined;
  const description = textSource(flags, "desc", "desc-file", creating);
  const input = compact({
    teamId: team?.id,
    title: value(flags, "title"),
    description,
    projectId: flags["clear-project"] ? null : project?.id,
    projectMilestoneId: flags["clear-milestone"] ? null : milestone?.id,
    parentId: flags["clear-parent"] ? null : value(flags, "parent"),
    dueDate: dateValue(value(flags, "due"), true),
    assigneeId: flags.unassign ? null : assignee?.id,
    stateId: state?.id,
    cycleId: flags["clear-cycle"] ? null : cycle?.id,
    labelIds: labelList?.map((item) => item.id),
    priority: intValue(value(flags, "priority"), "priority"),
  });
  return { input, links: values(flags, "link") };
}

const ISSUE_VALUE_FLAGS = [
  "team", "title", "desc", "desc-file", "project", "milestone", "due", "label", "link",
  "parent", "assignee", "state", "cycle", "priority",
];
const ISSUE_BOOLEAN_FLAGS = ["unassign", "clear-project", "clear-milestone", "clear-parent", "clear-cycle"];

export async function writeCommand(
  command: string,
  args: string[],
  client: LinearClient,
  output: OutputOptions,
): Promise<boolean> {
  if (command === "create-issue") {
    const { positionals, flags } = parseFlags(args, ISSUE_VALUE_FLAGS, [], ["label", "link"]);
    if (positionals.length) throw new LinearError("create-issue takes no positional arguments", "VALIDATION_ERROR");
    required(flags, "title");
    const { input, links } = await issueInput(client, flags, true);
    const data = await client.query<{ issueCreate: { success: boolean; issue: RecordValue } }>(
      "mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier title url } } }",
      { input },
    );
    const attached = await attachLinks(client, String(data.issueCreate.issue.id), links);
    printOutput({ created: data.issueCreate.success, issue: data.issueCreate.issue, links: attached }, output, [
      `Run \`linear issue ${data.issueCreate.issue.identifier}\``,
    ]);
    return true;
  }
  if (command === "update-issue") {
    const { positionals, flags } = parseFlags(args, ISSUE_VALUE_FLAGS, ISSUE_BOOLEAN_FLAGS, ["label", "link"]);
    const id = onlyOne(positionals, "update-issue");
    const current = await issue(client, id);
    const { input, links } = await issueInput(client, flags, false);
    if (!Object.keys(input).length && !links.length) throw new LinearError("No issue changes supplied", "VALIDATION_ERROR");
    let updated: RecordValue = current;
    if (Object.keys(input).length) {
      const data = await client.query<{ issueUpdate: { success: boolean; issue: RecordValue } }>(
        "mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { id identifier title url } } }",
        { id: current.id, input },
      );
      updated = data.issueUpdate.issue;
    }
    const attached = await attachLinks(client, String(current.id), links);
    printOutput({ updated: true, issue: updated, links: attached }, output, [`Run \`linear issue ${current.identifier}\``]);
    return true;
  }
  if (command === "delete-issue") {
    const { positionals, flags } = parseFlags(args, [], ["permanent"]);
    const current = await issue(client, onlyOne(positionals, "delete-issue"));
    const data = await client.query<{ issueDelete: { success: boolean } }>(
      "mutation DeleteIssue($id: String!, $permanent: Boolean) { issueDelete(id: $id, permanentlyDelete: $permanent) { success } }",
      { id: current.id, permanent: flags.permanent === true },
    );
    printOutput({ deleted: data.issueDelete.success, issue: current.identifier, recoverable: flags.permanent !== true }, output);
    return true;
  }
  if (command === "comment") {
    const { positionals, flags } = parseFlags(args, ["body", "body-file"]);
    const current = await issue(client, onlyOne(positionals, "comment"));
    const body = textSource(flags, "body", "body-file", true)!;
    const data = await client.query<{ commentCreate: { success: boolean; comment: RecordValue } }>(
      "mutation Comment($input: CommentCreateInput!) { commentCreate(input: $input) { success comment { id body createdAt url } } }",
      { input: { issueId: current.id, body } },
    );
    printOutput({ created: data.commentCreate.success, comment: data.commentCreate.comment }, output, [`Run \`linear comments ${current.identifier}\``]);
    return true;
  }
  if (command === "link") {
    const { positionals, flags } = parseFlags(args, ["url"], [], ["url"]);
    const current = await issue(client, onlyOne(positionals, "link"));
    const urls = values(flags, "url");
    if (!urls.length) throw new LinearError("--url is required", "VALIDATION_ERROR");
    const attached = await attachLinks(client, String(current.id), urls);
    printOutput({ linked: attached.length, issue: current.identifier, attachments: attached }, output, [`Run \`linear issue ${current.identifier}\``]);
    return true;
  }
  if (command === "relate") {
    const { positionals, flags } = parseFlags(args, ["to", "type"]);
    const current = await issue(client, onlyOne(positionals, "relate"));
    const related = await issue(client, required(flags, "to"));
    const type = required(flags, "type");
    if (!new Set(["blocks", "duplicate", "related", "similar"]).has(type)) {
      throw new LinearError("--type must be blocks, duplicate, related, or similar", "VALIDATION_ERROR");
    }
    const data = await client.query<{ issueRelationCreate: { success: boolean; issueRelation: RecordValue } }>(
      "mutation Relate($input: IssueRelationCreateInput!) { issueRelationCreate(input: $input) { success issueRelation { id type relatedIssue { id identifier title } } } }",
      { input: { issueId: current.id, relatedIssueId: related.id, type } },
    );
    printOutput({ created: data.issueRelationCreate.success, relation: data.issueRelationCreate.issueRelation }, output);
    return true;
  }
  if (command === "create-project") {
    const { positionals, flags } = parseFlags(args, ["team", "name", "desc", "desc-file", "summary", "lead", "target", "icon", "color", "state"], [], ["team"]);
    if (positionals.length) throw new LinearError("create-project takes no positional arguments", "VALIDATION_ERROR");
    const teamArgs = values(flags, "team");
    if (!teamArgs.length) throw new LinearError("--team is required", "VALIDATION_ERROR");
    const teamList = await Promise.all(teamArgs.map((item) => resolveTeam(client, item)));
    const lead = value(flags, "lead") ? await resolveUser(client, value(flags, "lead")!) : undefined;
    const state = value(flags, "state") ? await resolveProjectStatus(client, value(flags, "state")!, teamList[0]?.id) : undefined;
    const warnings: string[] = [];
    let summary = value(flags, "summary");
    if (summary && summary.length > 255) {
      summary = summary.slice(0, 255);
      warnings.push("summary truncated to Linear's 255-character limit");
    }
    const input = compact({
      teamIds: teamList.map((item) => item.id), name: required(flags, "name"),
      content: textSource(flags, "desc", "desc-file", true), description: summary,
      leadId: lead?.id, targetDate: dateValue(value(flags, "target"), false), icon: value(flags, "icon"),
      color: value(flags, "color"), statusId: state?.id,
    });
    const data = await client.query<{ projectCreate: { success: boolean; project: RecordValue } }>(
      "mutation CreateProject($input: ProjectCreateInput!) { projectCreate(input: $input) { success project { id slugId name url } } }",
      { input },
    );
    printOutput({ created: data.projectCreate.success, project: data.projectCreate.project, warnings }, output, [`Run \`linear project ${data.projectCreate.project.id}\``]);
    return true;
  }
  if (command === "update-project") {
    const { positionals, flags } = parseFlags(args, ["name", "desc", "desc-file", "summary", "lead", "target", "icon", "color", "state", "team"], ["clear-lead", "cancel", "complete"], ["team"]);
    const current = await resolveProject(client, onlyOne(positionals, "update-project"));
    const teamArgs = values(flags, "team");
    const teamList = teamArgs.length ? await Promise.all(teamArgs.map((item) => resolveTeam(client, item))) : undefined;
    const lead = value(flags, "lead") ? await resolveUser(client, value(flags, "lead")!) : undefined;
    const state = value(flags, "state") ? await resolveProjectStatus(client, value(flags, "state")!, teamList?.[0]?.id ?? current.teams?.nodes?.[0]?.id) : undefined;
    const warnings: string[] = [];
    let summary = value(flags, "summary");
    if (summary && summary.length > 255) { summary = summary.slice(0, 255); warnings.push("summary truncated to Linear's 255-character limit"); }
    const input = compact({
      name: value(flags, "name"), content: textSource(flags, "desc", "desc-file"), description: summary,
      leadId: flags["clear-lead"] ? null : lead?.id, targetDate: dateValue(value(flags, "target"), false),
      icon: value(flags, "icon"), color: value(flags, "color"), statusId: state?.id,
      teamIds: teamList?.map((item) => item.id), canceledAt: flags.cancel ? new Date().toISOString() : undefined,
      completedAt: flags.complete ? new Date().toISOString() : undefined,
    });
    if (!Object.keys(input).length) throw new LinearError("No project changes supplied", "VALIDATION_ERROR");
    const data = await client.query<{ projectUpdate: { success: boolean; project: RecordValue } }>(
      "mutation UpdateProject($id: String!, $input: ProjectUpdateInput!) { projectUpdate(id: $id, input: $input) { success project { id slugId name url } } }",
      { id: current.id, input },
    );
    printOutput({ updated: data.projectUpdate.success, project: data.projectUpdate.project, warnings }, output, [`Run \`linear project ${current.id}\``]);
    return true;
  }
  if (command === "delete-project") {
    const { positionals } = parseFlags(args, []);
    const current = await resolveProject(client, onlyOne(positionals, "delete-project"));
    const data = await client.query<{ projectDelete: { success: boolean } }>(
      "mutation DeleteProject($id: String!) { projectDelete(id: $id) { success } }", { id: current.id },
    );
    printOutput({ deleted: data.projectDelete.success, project: current.name }, output);
    return true;
  }
  if (command === "create-milestone") {
    const { positionals, flags } = parseFlags(args, ["project", "name", "target", "desc", "desc-file"]);
    if (positionals.length) throw new LinearError("create-milestone takes no positional arguments", "VALIDATION_ERROR");
    const owner = await resolveProject(client, required(flags, "project"));
    const input = compact({ projectId: owner.id, name: required(flags, "name"), targetDate: dateValue(value(flags, "target"), true), description: textSource(flags, "desc", "desc-file") });
    const data = await client.query<{ projectMilestoneCreate: { success: boolean; projectMilestone: RecordValue } }>(
      "mutation CreateMilestone($input: ProjectMilestoneCreateInput!) { projectMilestoneCreate(input: $input) { success projectMilestone { id name targetDate } } }", { input },
    );
    printOutput({ created: data.projectMilestoneCreate.success, milestone: data.projectMilestoneCreate.projectMilestone }, output);
    return true;
  }
  if (command === "update-milestone") {
    const { positionals, flags } = parseFlags(args, ["project", "name", "target", "desc", "desc-file"]);
    const owner = value(flags, "project") ? await resolveProject(client, value(flags, "project")!) : undefined;
    const current = await resolveMilestone(client, onlyOne(positionals, "update-milestone"), owner?.id);
    const input = compact({ projectId: owner?.id, name: value(flags, "name"), targetDate: dateValue(value(flags, "target"), true), description: textSource(flags, "desc", "desc-file") });
    if (!Object.keys(input).length) throw new LinearError("No milestone changes supplied", "VALIDATION_ERROR");
    const data = await client.query<{ projectMilestoneUpdate: { success: boolean; projectMilestone: RecordValue } }>(
      "mutation UpdateMilestone($id: String!, $input: ProjectMilestoneUpdateInput!) { projectMilestoneUpdate(id: $id, input: $input) { success projectMilestone { id name targetDate } } }", { id: current.id, input },
    );
    printOutput({ updated: data.projectMilestoneUpdate.success, milestone: data.projectMilestoneUpdate.projectMilestone }, output);
    return true;
  }
  if (command === "delete-milestone") {
    const { positionals, flags } = parseFlags(args, ["project"]);
    const owner = value(flags, "project") ? await resolveProject(client, value(flags, "project")!) : undefined;
    const current = await resolveMilestone(client, onlyOne(positionals, "delete-milestone"), owner?.id);
    const data = await client.query<{ projectMilestoneDelete: { success: boolean } }>(
      "mutation DeleteMilestone($id: String!) { projectMilestoneDelete(id: $id) { success } }", { id: current.id },
    );
    printOutput({ deleted: data.projectMilestoneDelete.success, milestone: current.name }, output);
    return true;
  }
  if (command === "create-doc") {
    const { positionals, flags } = parseFlags(args, ["project", "title", "content", "content-file"]);
    if (positionals.length) throw new LinearError("create-doc takes no positional arguments", "VALIDATION_ERROR");
    const owner = await resolveProject(client, required(flags, "project"));
    const input = { projectId: owner.id, title: required(flags, "title"), content: textSource(flags, "content", "content-file", true) };
    const data = await client.query<{ documentCreate: { success: boolean; document: RecordValue } }>(
      "mutation CreateDocument($input: DocumentCreateInput!) { documentCreate(input: $input) { success document { id slugId title url } } }", { input },
    );
    printOutput({ created: data.documentCreate.success, document: data.documentCreate.document }, output, [`Run \`linear doc ${data.documentCreate.document.id}\``]);
    return true;
  }
  if (command === "update-doc") {
    const { positionals, flags } = parseFlags(args, ["project", "title", "content", "content-file"]);
    const current = await document(client, onlyOne(positionals, "update-doc"));
    const owner = value(flags, "project") ? await resolveProject(client, value(flags, "project")!) : undefined;
    const input = compact({ projectId: owner?.id, title: value(flags, "title"), content: textSource(flags, "content", "content-file") });
    if (!Object.keys(input).length) throw new LinearError("No document changes supplied", "VALIDATION_ERROR");
    const data = await client.query<{ documentUpdate: { success: boolean; document: RecordValue } }>(
      "mutation UpdateDocument($id: String!, $input: DocumentUpdateInput!) { documentUpdate(id: $id, input: $input) { success document { id slugId title url project { id name } } } }", { id: current.id, input },
    );
    printOutput({ updated: data.documentUpdate.success, document: data.documentUpdate.document }, output);
    return true;
  }
  if (command === "patch-doc") {
    const { positionals, flags } = parseFlags(args, ["old", "new", "patch", "patch-file"]);
    const current = await document(client, onlyOne(positionals, "patch-doc"));
    let patches: Array<{ op: string; old_string: string; new_string: string }>;
    if (value(flags, "patch") || value(flags, "patch-file")) {
      const raw = textSource(flags, "patch", "patch-file", true)!;
      try { patches = JSON.parse(raw) as typeof patches; } catch { throw new LinearError("Patch must be valid JSON", "VALIDATION_ERROR"); }
    } else {
      const oldString = required(flags, "old");
      const newString = required(flags, "new");
      patches = [{ op: "replace", old_string: oldString, new_string: newString }];
    }
    let content = String(current.content ?? "");
    for (const patch of patches) {
      if (patch.op !== "replace" || typeof patch.old_string !== "string" || typeof patch.new_string !== "string") {
        throw new LinearError('Each patch must be {"op":"replace","old_string":"...","new_string":"..."}', "VALIDATION_ERROR");
      }
      if (patch.old_string.includes("uploads.linear.app")) {
        throw new LinearError("Upload URLs are unstable patch anchors; anchor on surrounding stored text", "VALIDATION_ERROR");
      }
      const first = content.indexOf(patch.old_string);
      if (first === -1) throw new LinearError("old_string does not match the currently stored document", "VALIDATION_ERROR");
      if (content.indexOf(patch.old_string, first + patch.old_string.length) !== -1) {
        throw new LinearError("old_string is ambiguous in the currently stored document", "VALIDATION_ERROR");
      }
      content = `${content.slice(0, first)}${patch.new_string}${content.slice(first + patch.old_string.length)}`;
    }
    const data = await client.query<{ documentUpdate: { success: boolean; document: RecordValue } }>(
      "mutation PatchDocument($id: String!, $input: DocumentUpdateInput!) { documentUpdate(id: $id, input: $input) { success document { id slugId title content url } } }", { id: current.id, input: { content } },
    );
    printOutput({ patched: data.documentUpdate.success, patches: patches.length, document: data.documentUpdate.document }, output, [`Run \`linear doc ${current.id}\``]);
    return true;
  }
  if (command === "delete-doc") {
    const { positionals } = parseFlags(args, []);
    const current = await document(client, onlyOne(positionals, "delete-doc"));
    const data = await client.query<{ documentDelete: { success: boolean } }>(
      "mutation DeleteDocument($id: String!) { documentDelete(id: $id) { success } }", { id: current.id },
    );
    printOutput({ deleted: data.documentDelete.success, document: current.title }, output);
    return true;
  }
  if (command === "upload") {
    const { positionals, flags } = parseFlags(args, ["type", "doc", "issue"]);
    const path = resolve(onlyOne(positionals, "upload"));
    const docArg = value(flags, "doc");
    const issueArg = value(flags, "issue");
    if (docArg && issueArg) throw new LinearError("Use only one of --doc and --issue", "VALIDATION_ERROR");
    let bytes: Buffer;
    let size: number;
    try { bytes = readFileSync(path); size = statSync(path).size; } catch { throw new LinearError(`Could not read file: ${path}`, "VALIDATION_ERROR"); }
    const filename = basename(path);
    const contentType = value(flags, "type") ?? (mimeLookup(filename) || "application/octet-stream");
    const prepared = await client.query<{ fileUpload: { success: boolean; uploadFile: { filename: string; contentType: string; size: number; uploadUrl: string; assetUrl: string; headers: Array<{ key: string; value: string }> } } }>(
      "mutation Upload($filename: String!, $contentType: String!, $size: Int!) { fileUpload(filename: $filename, contentType: $contentType, size: $size) { success uploadFile { filename contentType size uploadUrl assetUrl headers { key value } } } }",
      { filename, contentType, size },
    );
    const upload = prepared.fileUpload.uploadFile;
    const headers = Object.fromEntries(upload.headers.map(({ key, value }) => [key, value]));
    // Linear currently signs content-type without always returning it in UploadFile.headers.
    // It must still be sent byte-for-byte with the MIME type used to request the URL.
    headers["content-type"] = String(contentType);
    const put = await fetch(upload.uploadUrl, { method: "PUT", headers, body: bytes as unknown as BodyInit });
    if (!put.ok) throw new LinearError(`Upload PUT failed with HTTP ${put.status}; request a fresh signed URL`, "UPLOAD_ERROR");
    const markdown = `[${filename}](${upload.assetUrl})`;
    let target: RecordValue | undefined;
    if (docArg) {
      const current = await document(client, docArg);
      const content = `${String(current.content ?? "").trimEnd()}\n\n${markdown}\n`;
      await client.query("mutation Embed($id: String!, $input: DocumentUpdateInput!) { documentUpdate(id: $id, input: $input) { success } }", { id: current.id, input: { content } });
      target = await document(client, String(current.id));
    } else if (issueArg) {
      const current = await issue(client, issueArg);
      const description = `${String(current.description ?? "").trimEnd()}\n\n${markdown}\n`;
      await client.query("mutation Embed($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }", { id: current.id, input: { description } });
      target = await issue(client, String(current.id));
    }
    let normalizedEmbed = false;
    if (target) {
      const stateData = docArg
        ? await client.query<{ document: { contentState?: string } }>(
            "query EmbedState($id: String!) { document(id: $id) { contentState } }",
            { id: target.id },
          )
        : await client.query<{ issue: { descriptionState?: string } }>(
            "query EmbedState($id: String!) { issue(id: $id) { descriptionState } }",
            { id: target.id },
          );
      const encoded = docArg ? (stateData as any).document.contentState : (stateData as any).issue.descriptionState;
      const decoded = encoded ? Buffer.from(encoded, "base64").toString("utf8") : "";
      normalizedEmbed = decoded.includes("uploadState") && decoded.includes("finished") && decoded.includes(filename);
      if (!normalizedEmbed) {
        throw new LinearError("File uploaded, but Linear did not normalize the standalone link into a finished embed", "UPLOAD_ERROR");
      }
    }
    printOutput({ uploaded: true, filename, contentType, size, assetUrl: upload.assetUrl, markdown, embedded: Boolean(target), normalizedEmbed, target: target ? { id: target.id, url: target.url } : undefined }, output, target ? [] : ["Re-run with `--doc <id>` or `--issue <id>` to create a rendered embed"]);
    return true;
  }
  if (command === "create-initiative" || command === "update-initiative") {
    const creating = command === "create-initiative";
    const { positionals, flags } = parseFlags(args, ["name", "desc", "desc-file", "summary", "owner", "team", "target", "icon", "color", "status", "priority"]);
    const current = creating ? undefined : await initiative(client, onlyOne(positionals, command));
    if (creating && positionals.length) throw new LinearError("create-initiative takes no positional arguments", "VALIDATION_ERROR");
    const owner = value(flags, "owner") ? await resolveUser(client, value(flags, "owner")!) : undefined;
    const team = value(flags, "team") ? await resolveTeam(client, value(flags, "team")!) : undefined;
    const status = value(flags, "status");
    if (status && !new Set(["Proposed", "Planned", "Active", "Completed", "Canceled"]).has(status)) throw new LinearError("Invalid initiative status", "VALIDATION_ERROR");
    const input = compact({ name: creating ? required(flags, "name") : value(flags, "name"), content: textSource(flags, "desc", "desc-file", creating), description: value(flags, "summary"), ownerId: owner?.id, leadTeamId: team?.id, targetDate: dateValue(value(flags, "target"), false), icon: value(flags, "icon"), color: value(flags, "color"), status, priority: intValue(value(flags, "priority"), "priority") });
    const mutation = creating ? "initiativeCreate" : "initiativeUpdate";
    const query = creating
      ? `mutation CreateInitiative($input: InitiativeCreateInput!) { ${mutation}(input: $input) { success initiative { id slugId name url } } }`
      : `mutation UpdateInitiative($id: String!, $input: InitiativeUpdateInput!) { ${mutation}(id: $id, input: $input) { success initiative { id slugId name url } } }`;
    const data = await client.query<Record<string, { success: boolean; initiative: RecordValue }>>(query, compact({ id: current?.id, input }));
    printOutput({ [creating ? "created" : "updated"]: data[mutation]!.success, initiative: data[mutation]!.initiative }, output);
    return true;
  }
  if (command === "delete-initiative") {
    const { positionals } = parseFlags(args, []);
    const current = await initiative(client, onlyOne(positionals, "delete-initiative"));
    try {
      const data = await client.query<{ initiativeUpdate: { success: boolean } }>(
        "mutation DeleteInitiative($id: String!) { initiativeUpdate(id: $id, input: { trashed: true }) { success } }",
        { id: current.id },
      );
      printOutput({ deleted: data.initiativeUpdate.success, initiative: current.name, recoverable: true }, output);
    } catch {
      const data = await client.query<{ initiativeUpdate: { success: boolean } }>(
        "mutation CancelInitiative($id: String!) { initiativeUpdate(id: $id, input: { status: Canceled }) { success } }",
        { id: current.id },
      );
      printOutput({ deleted: false, canceled: data.initiativeUpdate.success, initiative: current.name, manualTrashRequired: true }, output, [
        "Linear rejected API trashing; remove the canceled initiative in the Linear UI",
      ]);
    }
    return true;
  }
  return false;
}
