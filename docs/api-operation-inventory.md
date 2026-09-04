# Source workflow API inventory

This inventory maps every Linear operation used by the 13 source workflows to a stable `linear` command. The source markdown was reviewed before implementation, and input field names were confirmed against live GraphQL introspection.

| Source workflow operation | CLI command |
| --- | --- |
| Confirm viewer and organization | `linear whoami` |
| List teams | `linear teams` |
| List workflow states | `linear states --team <key>` |
| List project states | `linear project-statuses [--team <key>]` |
| List labels | `linear labels` |
| List users or team members | `linear users [--team <key>]` |
| List and fetch projects | `linear projects`, `linear project <id>` |
| List project milestones | `linear milestones --project <id>` |
| List, search, and fetch issues | `linear issues`, `linear issue <id>` |
| Include archived issues for health history | `linear issues --archived` |
| Fetch issue comments | `linear comments <id>` |
| List and fetch documents | `linear docs`, `linear doc <id>` |
| List cycles | `linear cycles [--team <key>]` |
| List and fetch initiatives | `linear initiatives`, `linear initiative <id>` |
| Create and update issues, including parent, project, milestone, due date, labels, assignee, state, and cycle | `linear create-issue`, `linear update-issue` |
| Trash issues | `linear delete-issue` |
| Create issue comments | `linear comment` |
| Attach repository or other URLs | `linear link`, `linear link-repos` |
| Create issue relations and blockers | `linear relate` |
| Create, update, complete, cancel, and delete projects | `linear create-project`, `linear update-project`, `linear delete-project` |
| Create, update, and delete milestones | `linear create-milestone`, `linear update-milestone`, `linear delete-milestone` |
| Create, reparent, update, patch, and delete documents | `linear create-doc`, `linear update-doc`, `linear patch-doc`, `linear delete-doc` |
| Request a file upload, PUT exact bytes, insert a standalone link, and verify the embed | `linear upload <file> --doc|--issue <id>` |
| Create, update, and retire initiatives | `linear create-initiative`, `linear update-initiative`, `linear delete-initiative` |
| Date sweep and classification | `linear date-pass` plus date/delete primitives |
| Project population sweep | `linear project-pass` plus project/issue/milestone primitives |
| Shipped-work reconciliation view | `linear reflect-progress` plus issue/project primitives and `gh-axi` |

No workflow skill contains Linear MCP calls or raw Linear API requests. The nine judgment skills use the CLI for Linear I/O; the four mechanical workflows are top-level commands.
