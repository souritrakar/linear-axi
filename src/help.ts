export const COMMANDS = [
  "use <workspace>", "whoami", "teams", "states --team <key>", "project-statuses [--team <key>]",
  "labels [--query <text>]", "users [--team <key>]", "projects [--team <key> --query <text>]",
  "project <id>", "milestones [--project <id>]", "issues [--project --team --query --state --assignee]",
  "issue <id>", "comments <id>", "docs [--project <id>]", "doc <id>", "cycles [--team <key>]",
  "initiatives", "initiative <id>",
  "create-issue --team --title --desc [--project --milestone --due --label --link --parent]",
  "update-issue <id> [fields]", "delete-issue <id>", "comment <id> --body <text>",
  "link <id> --url <url>", "relate <id> --to <id> --type <type>",
  "create-project --team --name --desc [--lead --target --icon --color --summary]",
  "update-project <id> [fields]", "delete-project <id>",
  "create-milestone --project --name [--target --desc]", "update-milestone <id> [fields]",
  "delete-milestone <id>", "create-doc --project --title --content", "update-doc <id> [fields]",
  "patch-doc <id> --old <stored> --new <replacement>", "delete-doc <id>",
  "upload <file> [--doc <id> | --issue <id>] [--type <mime>]",
  "create-initiative --name --desc [fields]", "update-initiative <id> [fields]", "delete-initiative <id>",
  "date-pass [project | no-project | all]", "project-pass [project | all]",
  "reflect-progress --project <id>", "link-repos <issue> [--repo <url>]",
];

const DETAILS: Record<string, string[]> = {
  "create-issue": [
    "usage: linear create-issue --team <key> --title <text> (--desc <text> | --desc-file <path>) [flags]",
    "flags: --project --milestone --due YYYY-MM-DD --label (repeatable) --link (repeatable) --parent --assignee --state --cycle --priority",
  ],
  "update-issue": [
    "usage: linear update-issue <id> [--title --desc|--desc-file --project --milestone --due --label --link --parent --assignee --state --cycle --priority]",
    "clear flags: --unassign --clear-project --clear-milestone --clear-parent --clear-cycle; use --due clear to clear a due date",
  ],
  "create-project": [
    "usage: linear create-project --team <key> --name <text> (--desc <text> | --desc-file <path>) [flags]",
    "flags: --team (repeatable) --summary --lead --target YYYY-MM-DD --icon --color --state",
  ],
  "update-project": [
    "usage: linear update-project <id> [--name --desc|--desc-file --summary --lead --target --icon --color --state --team]",
    "flags: --clear-lead --cancel --complete; target dates cannot be cleared through Linear's API",
  ],
  "create-milestone": ["usage: linear create-milestone --project <id> --name <text> [--target YYYY-MM-DD --desc <text>|--desc-file <path>]"],
  "patch-doc": [
    "usage: linear patch-doc <id> --old <exact-stored-anchor> --new <replacement>",
    "or: linear patch-doc <id> (--patch <json-array> | --patch-file <path>)",
    'patch shape: [{"op":"replace","old_string":"...","new_string":"..."}]',
  ],
  upload: [
    "usage: linear upload <file> [--type <mime>] [--doc <id> | --issue <id>]",
    "With a target, appends a standalone markdown paragraph and verifies Linear normalized it to a file embed.",
  ],
};

export function topHelp(): string {
  return [
    "usage: linear [--workspace <name>] <command> [args] [flags] [--json] [--full]",
    `commands[${COMMANDS.length}]:`,
    ...COMMANDS.map((line) => `  ${line}`),
    "global flags: --workspace <name>, --json, --full, --help, -v/--version",
  ].join("\n");
}

export function commandHelp(command: string): string {
  const lines = DETAILS[command] ?? COMMANDS.filter((item) => item.split(" ")[0] === command).map((item) => `usage: linear ${item}`);
  return lines.length ? lines.join("\n") : topHelp();
}
