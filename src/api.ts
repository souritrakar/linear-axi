import { LinearClient } from "./graphql.js";
import { LinearError } from "./errors.js";

export type Entity = Record<string, any>;

interface Connection<T> {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor?: string };
}

export async function connection<T extends Entity>(
  client: LinearClient,
  field: string,
  selection: string,
  extraArgs = "",
  variables: Record<string, unknown> = {},
  variableDefs = "",
): Promise<T[]> {
  const all: T[] = [];
  let after: string | undefined;
  do {
    const query = `query Page($after: String${variableDefs}) {
      ${field}(first: 50, after: $after${extraArgs}) {
        nodes { ${selection} }
        pageInfo { hasNextPage endCursor }
      }
    }`;
    const data = await client.query<Record<string, Connection<T>>>(query, { ...variables, after });
    const page = data[field];
    if (!page) throw new LinearError(`Missing ${field} response`, "GRAPHQL_ERROR");
    all.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : undefined;
  } while (after);
  return all;
}

export const TEAM_FIELDS = "id name key description";
export const STATE_FIELDS = "id name type color team { id key name }";
export const LABEL_FIELDS = "id name color description team { id key name }";
export const USER_FIELDS = "id name displayName email active isMe";
export const PROJECT_FIELDS = `
  id name slugId description content icon color state targetDate startDate priority trashed canceledAt completedAt
  url status { id name type color } lead { id name email } teams { nodes { id key name } }
`;
export const MILESTONE_FIELDS = `
  id name description targetDate progress status project { id name slugId targetDate }
`;
export const ISSUE_LIST_FIELDS = `
  id identifier title priority priorityLabel dueDate createdAt updatedAt completedAt canceledAt trashed url
  state { id name type } team { id key name } assignee { id name email }
  project { id name slugId targetDate } projectMilestone { id name targetDate }
  parent { id identifier title } labels { nodes { id name } }
`;
export const ISSUE_DETAIL_FIELDS = `
  ${ISSUE_LIST_FIELDS} description branchName
  children { nodes { id identifier title state { name type } dueDate url } }
  comments { nodes { id body createdAt updatedAt url user { id name } } }
  attachments { nodes { id title subtitle url sourceType } }
  relations { nodes { id type relatedIssue { id identifier title url } } }
  inverseRelations { nodes { id type issue { id identifier title url } } }
`;
export const DOC_FIELDS = `
  id title slugId content createdAt updatedAt url
  project { id name slugId } initiative { id name slugId } team { id key name } issue { id identifier title }
`;
export const INITIATIVE_FIELDS = `
  id name slugId description content status targetDate color icon priority url
  owner { id name email } leadTeam { id key name } projects { nodes { id name slugId state targetDate url } }
`;

export async function teams(client: LinearClient): Promise<Entity[]> {
  return connection(client, "teams", TEAM_FIELDS);
}

export async function states(client: LinearClient): Promise<Entity[]> {
  return connection(client, "workflowStates", STATE_FIELDS);
}

export async function projectStatuses(client: LinearClient): Promise<Entity[]> {
  const direct = await connection<Entity>(client, "projectStatuses", "id name type color team { id key name }");
  if (direct.length) return direct;
  const seen = new Map<string, Entity>();
  for (const item of await projects(client, true)) {
    if (!item.status?.id) continue;
    for (const team of item.teams?.nodes ?? [undefined]) {
      const key = `${item.status.id}:${team?.id ?? "workspace"}`;
      seen.set(key, { ...item.status, team });
    }
  }
  return [...seen.values()];
}

export async function labels(client: LinearClient): Promise<Entity[]> {
  return connection(client, "issueLabels", LABEL_FIELDS);
}

export async function users(client: LinearClient): Promise<Entity[]> {
  return connection(client, "users", USER_FIELDS);
}

export async function projects(client: LinearClient, includeArchived = false): Promise<Entity[]> {
  return connection(
    client,
    "projects",
    PROJECT_FIELDS,
    ", includeArchived: $includeArchived",
    { includeArchived },
    ", $includeArchived: Boolean",
  );
}

export async function milestones(client: LinearClient, includeArchived = false): Promise<Entity[]> {
  return connection(
    client,
    "projectMilestones",
    MILESTONE_FIELDS,
    ", includeArchived: $includeArchived",
    { includeArchived },
    ", $includeArchived: Boolean",
  );
}

export async function issues(client: LinearClient, includeArchived = false): Promise<Entity[]> {
  return connection(
    client,
    "issues",
    ISSUE_LIST_FIELDS,
    ", includeArchived: $includeArchived",
    { includeArchived },
    ", $includeArchived: Boolean",
  );
}

export async function documents(client: LinearClient, includeArchived = false): Promise<Entity[]> {
  return connection(
    client,
    "documents",
    DOC_FIELDS,
    ", includeArchived: $includeArchived",
    { includeArchived },
    ", $includeArchived: Boolean",
  );
}

export async function initiatives(client: LinearClient, includeArchived = false): Promise<Entity[]> {
  return connection(
    client,
    "initiatives",
    INITIATIVE_FIELDS,
    ", includeArchived: $includeArchived",
    { includeArchived },
    ", $includeArchived: Boolean",
  );
}

export async function cycles(client: LinearClient, includeArchived = false): Promise<Entity[]> {
  return connection(
    client,
    "cycles",
    "id number name startsAt endsAt completedAt progress isActive team { id key name }",
    ", includeArchived: $includeArchived",
    { includeArchived },
    ", $includeArchived: Boolean",
  );
}

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function findOne<T extends Entity>(items: T[], selector: string, label: string): T {
  const wanted = norm(selector);
  const matches = items.filter((item) =>
    [item.id, item.key, item.identifier, item.slugId, item.name, item.email, item.displayName]
      .filter(Boolean)
      .some((value) => norm(String(value)) === wanted),
  );
  if (matches.length === 0) throw new LinearError(`${label} not found: ${selector}`, "NOT_FOUND");
  if (matches.length > 1) {
    throw new LinearError(`Ambiguous ${label}: ${selector}`, "VALIDATION_ERROR", [
      `Use an exact ${label} ID`,
    ]);
  }
  return matches[0]!;
}

export async function resolveTeam(client: LinearClient, selector: string): Promise<Entity> {
  return findOne(await teams(client), selector, "team");
}

export async function resolveProject(client: LinearClient, selector: string): Promise<Entity> {
  return findOne(await projects(client, true), selector, "project");
}

export async function resolveMilestone(
  client: LinearClient,
  selector: string,
  projectId?: string,
): Promise<Entity> {
  const list = (await milestones(client, true)).filter(
    (item) => !projectId || item.project?.id === projectId,
  );
  return findOne(list, selector, "milestone");
}

export async function resolveUser(client: LinearClient, selector: string): Promise<Entity> {
  if (norm(selector) === "me") {
    const data = await client.query<{ viewer: Entity }>(`query { viewer { ${USER_FIELDS} } }`);
    return data.viewer;
  }
  return findOne(await users(client), selector, "user");
}

export async function resolveState(
  client: LinearClient,
  selector: string,
  teamId?: string,
): Promise<Entity> {
  const list = (await states(client)).filter((item) => !teamId || item.team?.id === teamId);
  return findOne(list, selector, "state");
}

export async function resolveProjectStatus(
  client: LinearClient,
  selector: string,
  teamId?: string,
): Promise<Entity> {
  const list = (await projectStatuses(client)).filter((item) => !teamId || !item.team || item.team.id === teamId);
  return findOne(list, selector, "project status");
}

export async function resolveLabels(client: LinearClient, selectors: string[]): Promise<Entity[]> {
  const list = await labels(client);
  return selectors.map((selector) => findOne(list, selector, "label"));
}

export async function resolveCycle(
  client: LinearClient,
  selector: string,
  teamId?: string,
): Promise<Entity> {
  const list = (await cycles(client, true)).filter((item) => !teamId || item.team?.id === teamId);
  return findOne(list, selector, "cycle");
}

export async function issue(client: LinearClient, selector: string): Promise<Entity> {
  const data = await client.query<{ issue: Entity }>(
    `query Issue($id: String!) { issue(id: $id) { ${ISSUE_DETAIL_FIELDS} } }`,
    { id: selector },
  );
  return data.issue;
}

export async function document(client: LinearClient, selector: string): Promise<Entity> {
  try {
    const data = await client.query<{ document: Entity }>(
      `query Document($id: String!) { document(id: $id) { ${DOC_FIELDS} } }`,
      { id: selector },
    );
    return data.document;
  } catch (error) {
    if (!(error instanceof LinearError) || error.code !== "GRAPHQL_ERROR") throw error;
    return findOne(await documents(client, true), selector, "document");
  }
}

export async function project(client: LinearClient, selector: string): Promise<Entity> {
  const resolved = await resolveProject(client, selector);
  const data = await client.query<{ project: Entity }>(
    `query Project($id: String!) { project(id: $id) {
      ${PROJECT_FIELDS}
    } }`,
    { id: resolved.id },
  );
  const [milestoneRows, issueRows, documentRows, initiativeRows] = await Promise.all([
    milestones(client, true), issues(client, true), documents(client, true), initiatives(client, true),
  ]);
  data.project.projectMilestones = { nodes: milestoneRows.filter((item) => item.project?.id === resolved.id) };
  data.project.issues = { nodes: issueRows.filter((item) => item.project?.id === resolved.id) };
  data.project.documents = { nodes: documentRows.filter((item) => item.project?.id === resolved.id) };
  data.project.initiatives = { nodes: initiativeRows.filter((item) => item.projects?.nodes?.some((project: Entity) => project.id === resolved.id)).map(({ id, name, slugId, url }) => ({ id, name, slugId, url })) };
  return data.project;
}

export async function initiative(client: LinearClient, selector: string): Promise<Entity> {
  const resolved = findOne(await initiatives(client, true), selector, "initiative");
  const data = await client.query<{ initiative: Entity }>(
    `query Initiative($id: String!) { initiative(id: $id) { ${INITIATIVE_FIELDS} documents { nodes { ${DOC_FIELDS} } } } }`,
    { id: resolved.id },
  );
  return data.initiative;
}
