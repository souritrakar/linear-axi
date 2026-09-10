# linear-axi

`linear-axi` is a deterministic Linear CLI for agents. It keeps reusable Linear mechanics behind stable commands so workflows do not depend on an expiring MCP session or one-off API calls.

It follows the [AXI protocol](https://axi.md): compact TOON output by default, JSON with `--json`, minimal list schemas, `--full` for untruncated content, explicit empty states, structured errors, non-interactive commands, loud unknown flags, and short next-step hints.

## Requirements

- Node.js 20 or newer
- A Linear organization-scoped API key

## Install

```sh
npm install
npm run build
mkdir -p ~/.local/bin
ln -s "$(pwd)/dist/bin/linear.js" ~/.local/bin/linear
```

If `~/.local/bin` is not on `PATH`, add it in your shell profile. To replace an existing development link deliberately, inspect it first and then use `ln -sfn` with the same paths. The symlink must target a permanent checkout, never a temporary or throwaway worktree: `dist/` is gitignored and disappears with that worktree.

## Authentication and workspaces

The CLI resolves credentials in this order:

1. `LINEAR_API_KEY`
2. `~/.config/linear-axi/profiles/<workspace>.key`

Select a persistent default or override one call:

```sh
chmod 600 ~/.config/linear-axi/profiles/acme.key
linear use acme
linear whoami
linear --workspace personal whoami
linear issues --workspace acme --json
```

The key is sent directly in the `Authorization` header. It is never prefixed with `Bearer`, printed, or stored in this repository.

## Read commands

```sh
linear                         # live home view
linear whoami
linear teams
linear states --team AGE
linear project-statuses --team AGE
linear labels [--query text]
linear users [--team AGE]
linear projects [--team AGE] [--query text]
linear project <id-or-slug>
linear milestones [--project <id-or-name>]
linear issues [--project ...] [--team ...] [--query ...] [--state ...] [--assignee ...]
linear issue <identifier>
linear comments <identifier>
linear docs [--project ...] [--query ...]
linear doc <id-or-slug>
linear cycles [--team AGE]
linear initiatives
linear initiative <id-or-slug>
```

List commands return a `count` even when it is zero. Detail content is truncated by default; pass `--full` to inspect exact stored markdown.

## Write commands

All commands are non-interactive. Use `--desc-file`, `--content-file`, or `--body-file` when shell quoting would be awkward.

```sh
linear create-issue --team AGE --title "Title" --desc-file issue.md \
  [--project ... --milestone ... --due YYYY-MM-DD --label ... --link ... --parent ...]
linear update-issue AGE-12 [--title ... --desc-file ... --state ... --assignee ...]
linear delete-issue AGE-12
linear comment AGE-12 --body-file comment.md
linear link AGE-12 --url https://github.com/org/repo
linear relate AGE-12 --to AGE-13 --type blocks

linear create-project --team AGE --name "Name" --desc-file project.md \
  [--summary ... --lead ... --target YYYY-MM-DD --icon Calendar --color '#4EA7FC']
linear update-project <id> [fields]
linear delete-project <id>

linear create-milestone --project <id> --name "Name" [--target YYYY-MM-DD --desc ...]
linear update-milestone <id> [fields]
linear delete-milestone <id>

linear create-doc --project <id> --title "Title" --content-file doc.md
linear update-doc <id> [--project ... --title ... --content-file ...]
linear patch-doc <id> --old "exact stored anchor" --new "replacement"
linear patch-doc <id> --patch-file patches.json
linear delete-doc <id>

linear upload report.xlsx --doc <id>
linear upload report.xlsx --issue AGE-12

linear create-initiative --name "Name" --desc-file initiative.md [fields]
linear update-initiative <id> [fields]
linear delete-initiative <id>
```

Patch arrays must use the exact shape below. The CLI fetches the current stored document before matching, rejects missing or ambiguous anchors, and refuses unstable upload-URL anchors.

```json
[{"op":"replace","old_string":"stored text","new_string":"replacement"}]
```

Uploads are completed end to end: signed-URL request, exact-header PUT, standalone markdown insertion, and verification that Linear's stored document state contains a finished file embed. A bare upload without `--doc` or `--issue` returns markdown and an explicit hint; it does not claim the asset is embedded.

## Mechanical workflow commands

```sh
linear date-pass [project | no-project | all]
linear project-pass [project | all]
linear reflect-progress --project <id>
linear link-repos <issue>                    # inspect current links
linear link-repos <issue> --repo <url>       # apply approved links
```

`date-pass` classifies overdue, undated, and container-inconsistent dates without inventing replacements. `project-pass` reports population gaps. `reflect-progress` presents the Linear side of the reconciliation and gives concrete `gh-axi` and `linear` next steps. `link-repos` separates inspection from the approved write.

## Agent workflow skills

The nine judgment workflows live under [`skills/`](skills/). They handle investigation, drafting, ambiguity, and approval while routing every Linear read and write through this CLI:

- `new-issue`
- `new-project`
- `split-issue`
- `sync-issue`
- `propose-issues`
- `groundwork`
- `meeting-agenda`
- `file-embed`
- `style-check`

Approval behavior is shared across the judgment skills; see [`references/approval-policy.md`](references/approval-policy.md).

Together with the four mechanical commands above, these cover all 13 source workflows. Shared prose rules are in [`references/writing-style.md`](references/writing-style.md). The workflows do not impose a module, milestone, issue, or initiative hierarchy.

To install the skills for Codex while keeping them opt-in, symlink or copy only the desired directories into `~/.codex/skills/`. For Claude Code, place them under the appropriate `.claude/skills/` directory.

## Linear behaviors preserved

- Markdown is normalized on save. Fetch current stored content before constructing a patch anchor.
- Patch entries use `op`, `old_string`, and `new_string` exactly.
- Project summaries cap at 255 characters. The CLI trims the summary and reports it; it does not trim the long project body.
- Project and initiative target dates cannot be cleared through the API. The CLI reports the UI-only action and does not retry.
- Issue due dates can be cleared with `--due clear`.
- File links must occupy a standalone paragraph to become authenticated attachment chips.
- API trashing of an initiative can be rejected by Linear. The delete command then cancels it and reports that UI trashing remains.

## Development

```sh
npm run typecheck
npm test
npm run build
```

The GraphQL schema is the implementation authority. Input types used by the commands were introspected live before implementation, and the complete Layer 1 surface was exercised against the Acme workspace.
