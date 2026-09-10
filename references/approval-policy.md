# Approval policy

These workflows write to a durable, human-readable project record. Approval is proportional to what a
write changes, not to the fact that it is a write.

## Write without asking

A write may proceed without approval when all of these hold:

- it stays inside a project and milestone that already exist and were agreed;
- every fact it adds is verified against a checkable PR, commit, run URL, or file that you inspected;
- it changes no scope, no priority, and no product, UX, or architecture decision;
- nothing about it is ambiguous or contradicted by another source.

Writes of this kind: state transitions among the workspace's existing unstarted, started, and
completed states; adding a verified PR, commit, spec, or artifact link; attaching a verified file or
screenshot; a comment recording a blocker, a decision, or evidence; a clarity or style rewrite that
adds and removes no fact; recording newly discovered follow-up work as an unscheduled issue.

## Ask first

Ask, present the complete draft, and wait for an explicit answer when a write would:

- create, rename, or redefine a project, a milestone, or an initiative;
- change a target date, scope, or priority;
- record a product, UX, or architecture decision;
- cancel, mark duplicate, archive, or delete anything;
- introduce work that the agreed scope does not already imply;
- resolve an ambiguity, a conflict, or a claim you could not verify.

When in doubt, ask. An unnecessary question costs one round trip; an unapproved roadmap change costs
trust in the record.

## Blocked work

Some workspaces have no blocked state. Where none exists, do not invent one and do not park the issue
in an unrelated state. Record the blocker with `linear relate <id> --to <blocker-id> --type blocks`
and a comment naming what would unblock it, and leave the state at what is actually true.
