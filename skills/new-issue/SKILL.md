---
name: new-issue
description: Draft a Linear issue from rough input, check duplicates, apply the shared writing style, and create it only after approval. All Linear I/O uses the linear CLI.
argument-hint: [rough description]
disable-model-invocation: true
---

# New issue

Draft from `$ARGUMENTS`. Ask for a description when it is missing. Default to team `AGE` only when the active workspace makes that unambiguous; otherwise inspect `linear teams` and ask.

1. Extract two to four keywords and run `linear issues --query "<keywords>" --full`. A failed search is “dedup not completed,” not proof that no issue exists.
2. Identify relevant repositories from the current project’s repo registry. Read checked-out code and nearby knowledge-base documents. Use `gh-axi` only with permission when a relevant repo is not local. Record how every precise claim was verified.
3. Run `linear projects --team <team>` and choose a project only when the match is clear. If the work has its own finish line and will accumulate issues, route to `new-project`. Ask for a due date; undated is an explicit choice. Compare it with the project target from `linear project <id>`.
4. Draft a self-contained title and description using `references/writing-style.md`. Do not turn unverified assertions into facts.
5. Apply the `style-check` skill.
6. Apply `references/approval-policy.md`. When the issue lands in a project and milestone that
   already exist, step 1 found no plausible duplicate, and the work is already implied by that
   milestone's agreed scope, create it and report the draft with your result. In every other case —
   new scope, uncertain placement, an unresolved duplicate, or a date beyond the project target —
   present the complete draft, team, project, due date, repository link, verification evidence, and
   likely duplicates, then wait for explicit approval.
7. Write the approved description to a temporary file and run `linear create-issue --team <team> --title "<title>" --desc-file <file> [--project <id>] [--due YYYY-MM-DD] [--link <repo-url>]`. Do not set an assignee unless requested.
8. Re-fetch with `linear issue <identifier> --full` and report its URL.
