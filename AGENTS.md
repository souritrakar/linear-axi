# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Run `npm run typecheck`, `npm test`, and `npm run build` before shipping changes.
- [`docs/api-operation-inventory.md`](docs/api-operation-inventory.md) maps the source workflows to CLI commands; keep it current when the command surface changes.
- [`references/writing-style.md`](references/writing-style.md) is the authority for Linear-bound prose and the markdown/date/upload quirks the workflow skills preserve.
- Linear input field names must come from live schema introspection rather than memory. Verify changed mutations against the Acme workspace with disposable records.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
