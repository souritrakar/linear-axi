# Linear writing style

Apply these rules to every title, description, project body, document, and comment written through `linear`.

## Purpose and placement

- Linear is a human-readable plan of record.
- Issues carry chronology, normally one issue per PR-sized unit of work.
- Project bodies explain what exists now, how to use it, and why it is this way. Keep chronology in issues.
- Comments carry discussion, state-change rationale, and credit. Put facts in descriptions.
- Give each fact one home. Link to repository documentation instead of copying it.
- Verify shipped-work claims against a checkable PR, commit, or run URL.

## Voice

Write like an engineer leaving notes for a colleague who will act tomorrow. Every line must add a fact, decision, or question. Use plain declarative sentences and varied sentence length. Warmth is fine; performance is not.

Avoid unverifiable absolutes, emoji, exclamation marks, hype adjectives, canned transitions, rhetorical triads, chatbot phrasing, and verbs such as “leverage,” “foster,” “showcase,” or “delve.” Prefer precise claims such as “does not custody.”

## Structure

- Make issues self-contained for readers without conversation context.
- Use natural headings such as Background, Key facts, Deliverables, Open questions, and Known gaps.
- Put observable completion criteria in Background, not in a separate “Definition of done.”
- Keep owners, assignees, and reviewers in Linear fields rather than prose.
- Use absolute ISO dates.
- Separate established facts from open questions.
- Do not repeat the title in the opening sentence.
- State the current situation. Put chronology in comments.

## Revision and accretion

When updating existing text, fetch the stored form first with `linear issue`, `linear project`, or `linear doc --full`. Linear normalizes markdown on save, so anchors copied from a draft may no longer match.

Rewrite affected sections from the current facts instead of appending an update. Remove resolved questions, replace superseded facts, and delete obsolete text before adding new text. A description should grow only when scope grew.

For document patches, use:

```json
[{"op":"replace","old_string":"exact stored text","new_string":"replacement"}]
```

Pass the file to `linear patch-doc <id> --patch-file <path>`. Never use a generated upload URL as an anchor because signed URLs change on read.

## API-backed field constraints

- Project summaries are limited to 255 characters. The CLI trims only the summary and reports the change; long project bodies remain intact.
- Linear cannot clear a project or initiative target date through the API. The CLI reports this and directs the user to the UI.
- Issue due dates can be cleared with `linear update-issue <id> --due clear`.
