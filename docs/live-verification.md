# Live verification

Layer 1 was exercised on 2026-09-03/04 against the `acme` Linear organization (team `AGE`). `--workspace personal whoami` separately confirmed profile isolation and access to the Personal organization.

The pass covered:

- persistent `linear use`, environment/profile resolution, and workspace override;
- TOON and `--json` output across list and detail commands;
- teams, issue states, project states, labels, users, projects, milestones, issues, comments, documents, cycles, and initiatives;
- a disposable project, milestone, parent issue, sub-issue, relation, comment, URL attachments, and document;
- issue, project, milestone, document, and initiative updates;
- exact stored-content document patching;
- signed upload plus PUT of `README.md`, standalone document insertion, and stored-content-state verification of `uploadState=finished`;
- `date-pass`, `project-pass`, `reflect-progress`, and the inspection half of `link-repos`;
- cleanup through document, issue, milestone, project, and initiative delete/retire commands.

Linear rejected direct initiative trashing with an internal API error. The command's documented fallback canceled the disposable initiative and reported `manualTrashRequired: true` rather than claiming deletion.
