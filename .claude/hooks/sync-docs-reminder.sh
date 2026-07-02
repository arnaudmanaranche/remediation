#!/usr/bin/env bash
# Stop hook: nudge to keep the knowledge base in sync.
#
# Fires when the working tree has source changes under packages/*/src but no
# knowledge doc was touched. Blocks the stop once (guarded by stop_hook_active)
# so the model goes and updates the relevant doc, then lets it stop normally.
set -euo pipefail

input="$(cat)"

# Avoid an infinite loop: if this stop already resulted from a stop-hook
# continuation, do nothing.
if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -n "$root" ] || exit 0
cd "$root" || exit 0

changed="$(git status --porcelain 2>/dev/null || true)"
[ -n "$changed" ] || exit 0

# Product source changed?
printf '%s\n' "$changed" | grep -Eq 'packages/[^/]+/src/' || exit 0

# A knowledge/doc file already touched in the same working tree? Then we're fine.
if printf '%s\n' "$changed" | grep -Eq '(^|[ /])(CLAUDE|README|CONTEXT|PRODUCT|TODO)\.md|docs/knowledge/'; then
  exit 0
fi

reason="Source under packages/*/src changed but no knowledge doc was updated in this working tree. Per CLAUDE.md, update the affected doc in the SAME change: docs/knowledge/architecture.md (extractors / analyze pipeline / codemod / cssProperties), README.md (commands, flags, rules, config), TODO.md (open or fixed limitations), CONTEXT.md (vocabulary), docs/knowledge/build-test-run.md or release-process.md (tooling). If the change genuinely needs no doc update, state that in one line and stop."

printf '{"decision":"block","reason":%s}\n' "$(printf '%s' "$reason" | jq -Rs .)"
