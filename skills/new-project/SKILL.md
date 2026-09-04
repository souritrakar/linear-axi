---
name: new-project
description: Interview for a new or thin Linear project, then create or update its fields, milestones, and initial issues through the linear CLI after approval.
argument-hint: [project name or rough idea]
---

# New project

Run `linear projects --query "$ARGUMENTS" --full` to choose create mode or adopt mode. In adopt mode, fetch `linear project <id> --full`, show the current state, and skip questions the record already answers.

Interview one block at a time. Use only answers and verified facts; unanswered questions remain open or omitted.

1. Problem and observable finish line.
2. Roadmap or initiative placement, if the workspace uses one. Do not impose a hierarchy.
3. Known work buckets. Each confirmed bucket may become a milestone; unknown shape means no milestones.
4. Work startable now. Do not invent future issues.
5. Project, milestone, and issue dates. Resolve relative dates to ISO and echo them. No child date may exceed the project target.
6. Lead and issue assignees. Keep names in fields, not descriptions.
7. Blockers, dependencies, and excluded scope.

Assemble a project name, summary of at most 255 characters, body, named icon and color, lead, target, milestones, and initial issues. Follow `references/writing-style.md` and run `style-check` on every text field. For many dates or choices, collect review through Lavish before writing.

Present everything and wait for explicit approval. Then:

- Create with `linear create-project --team <team> --name <name> --desc-file <file> [--summary ... --lead ... --target ... --icon ... --color ...]`, or update with `linear update-project <id> ...`.
- Create confirmed milestones with `linear create-milestone --project <id> --name <name> [--target ... --desc-file ...]`.
- Create confirmed initial issues with `linear create-issue`, always passing `--project <id>` and only answered dates and assignees.
- Update a roadmap document only after fetching its stored form and applying exact anchors through `linear patch-doc`.

Verify with `linear project <id> --full`.
