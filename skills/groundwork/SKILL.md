---
name: groundwork
description: Seed local groundwork for a Linear issue from the live issue, comments, related issues, repository evidence, and bounded knowledge search.
argument-hint: [issue-id]
disable-model-invocation: true
---

# Groundwork

This workflow is local-only and never writes to Linear.

1. Fetch `linear issue $ARGUMENTS --full` and `linear comments $ARGUMENTS --full`. When no real identifier exists, state that comments were unavailable rather than inventing one.
2. Identify relevant repositories from the active project’s registry. Trust observed code over a stale registry and report the discrepancy. Ask before using `gh-axi` for a repo that is not checked out.
3. Extract focused keywords from the title and Background. Search nearby knowledge documents, checked-out code, and `linear issues --query "<keywords>" --full`.
4. Create a short issue-named directory. If `groundwork.md` exists, stop for a choice between updating, appending a dated addendum, or using another filename.
5. Seed sections covering why the work matters, framing, gap analysis, open questions and decisions, and a proposed work plan. Cite repositories, documents, and related issues by name.
6. Report the path. Route work with its own finish line to `new-project`; route independently closeable pieces to `split-issue`.
