---
name: propose-issues
description: Scan a bounded code or knowledge area for evidenced gaps, deduplicate them in Linear, and create only selected drafts through linear CLI.
argument-hint: [bounded area, topic, or repository]
disable-model-invocation: true
---

# Propose issues

Require a bounded `$ARGUMENTS` scope. Do not sweep an entire organization without a narrower topic.

1. Read the named files, directory, documents, or repository. Candidates must cite observed TODOs, stale docs, missing tests for changed code, or disclosed unresolved work.
2. For each candidate, run `linear issues --query "<keywords>" --full`. Drop duplicates of open issues.
3. Check placement with `linear projects --query "<topic>"` and the relevant `linear project <id>`. Ask rather than guess when placement or a due date conflicts with project timing.
4. Draft titles and descriptions using `references/writing-style.md`, then run `style-check`.
5. Present every draft with evidence, intended project, repository, and due date. For more than eight, use a Lavish selection surface. Wait for selection and approval.
6. Create only selected drafts using `linear create-issue ...`. Pass the project, due date, and repository link exactly as approved.
7. Verify each with `linear issue <identifier> --full`. Name explicitly undated issues.
