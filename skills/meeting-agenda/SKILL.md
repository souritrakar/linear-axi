---
name: meeting-agenda
description: Generate or close out a dated team meeting document from live Linear and GitHub state, using linear CLI for all Linear I/O.
argument-hint: [YYYY-MM-DD | close YYYY-MM-DD]
disable-model-invocation: true
---

# Meeting agenda

Resolve the date to ISO and echo it. Ask when missing. Team name, meeting-project name, roadmap document, and repository registry come from the workspace using this skill; do not hard-code them into the CLI.

## Generate

1. Locate the target and previous meeting with `linear docs --project <meeting-project> --full`. Fetch members with `linear users --team <team>`. Adopt only an empty template or a prior generated document; preserve handwritten notes.
2. Ask for discussion topics. Skipping is valid.
3. Gather `linear issues --team <team> --archived --full`, `linear docs --full`, `linear projects --archived --full`, and milestones per project. Use `gh-axi pr list` for configured repositories since the previous meeting.
4. Compute triage, recap, near-term targets, project health, stalled work, and open blocking relations. Omit empty sections, except the PR line must say that none were found.
5. Diff the stored roadmap fetched with `linear doc <id> --full` against the skill’s local snapshot. When missing, establish a baseline.
6. Collect section selection and issue assignment/cancel decisions. For large sets, use a Lavish input artifact. A skipped response preserves current values. Never invent assignments.
7. Apply approved changes with `linear update-issue`; resolve the team’s Canceled state from `linear states --team <team>`.
8. Assemble Agenda, Action Items by member, unassigned work, and a final Scratchwork to transform section. Link every issue, document, and PR to its source. Apply `references/writing-style.md` and `style-check`.
9. Create with `linear create-doc --project <meeting-project> --title <date-title> --content-file <file>`, or replace generated content with `linear update-doc <id> --project <meeting-project> --content-file <file>`.
10. Verify with `linear doc <id> --full`, then update the local roadmap snapshot.

## Closeout

Fetch the document and read only Scratchwork to transform. Classify each note as a new issue, update, or assignment. Ask about ambiguity, present all actions, and wait for explicit approval. Apply them with `linear create-issue` and `linear update-issue`. Fetch the document again, then replace the scratch span through `linear patch-doc` using an exact stored anchor and links to the resulting issues.
