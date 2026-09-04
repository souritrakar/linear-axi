---
name: file-embed
description: Upload raw bytes and append a verified Linear file embed through the linear CLI without producing a link that returns 401.
argument-hint: [file path and --doc or --issue target]
---

# File embed

The source must be the real local file, not extracted text or a recreated lookalike.

1. Identify the target document or issue. Fetch it with `linear doc <id> --full` or `linear issue <id> --full`.
2. Run `linear upload <file> --doc <id>` or `linear upload <file> --issue <id>`. Pass `--type <mime>` only when extension detection is wrong.
3. The CLI requests a signed URL, sends every returned header plus the signed content type, uploads the exact bytes before expiry, appends the asset link as its own paragraph, and inspects Linear’s stored content state for a finished file node.
4. Require `embedded: true` and `normalizedEmbed: true` in the output. Otherwise do not present the URL as usable; request a fresh upload rather than retrying an expired signed URL.
5. Verify the visible target with `linear doc <id> --full` or `linear issue <id> --full`.

Never place the markdown link inside a list item. Never use an `uploads.linear.app` URL as a patch anchor because signatures change between reads.
