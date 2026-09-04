---
name: split-issue
description: Decompose an oversized Linear issue into a trimmed parent and self-contained sub-issues, with approval before CLI writes.
argument-hint: [issue-id]
disable-model-invocation: true
---

# Split issue

1. Fetch `$ARGUMENTS` with `linear issue <id> --full`.
2. Derive independently closeable children only from committed Background or Deliverables. Do not silently promote open questions into scope.
3. Draft a trimmed parent and standalone children. Remove duplicated facts from the parent and point to the child instead.
4. Preserve the parent’s team and project explicitly. Decide repository links per child. Ask for each due date; compare it with the parent due date and project target.
5. Apply `references/writing-style.md` and run `style-check` on every draft.
6. Present the entire split with placement, dates, and links. Wait for explicit approval.
7. Create children first with `linear create-issue --team <team> --project <project> --parent <parent-id> ...`. Then update the parent using `linear update-issue <id> --desc-file <trimmed-parent-file>`.
8. Verify with `linear issue <parent-id> --full` and report all child URLs.
