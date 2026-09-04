---
name: sync-issue
description: Fold annotations and comments into a clean current Linear issue after verification and approval, using only linear CLI for Linear I/O.
argument-hint: [issue-id]
disable-model-invocation: true
---

# Sync issue

1. Pull `linear issue $ARGUMENTS --full` and `linear comments $ARGUMENTS --full`. Treat inline notes and comments as answers or corrections.
2. Identify relevant repositories. Verify local implementation facts in checked-out code and remote GitHub facts through `gh-axi` when authorized.
3. Classify each answer as high-confidence or ambiguous. Conflicts are always ambiguous. Due dates beyond a project target are ambiguous. Split compound claims so verified and reporter-asserted parts remain distinct.
4. Fold high-confidence answers into facts, remove answered questions, and rewrite affected sections from today’s fact set. Follow `references/writing-style.md` and run `style-check`.
5. Present the complete before/after, verification evidence, auto-folded answers, ambiguities, and repository choice. Wait for explicit approval and ambiguity resolution.
6. Fetch the issue again immediately before writing. Save the approved text with `linear update-issue <id> --desc-file <file> [--link <repo-url>]`.
7. Verify with `linear issue <id> --full`. Search the local filesystem before claiming no related notes exist, and update any found notes to match the resolution.
