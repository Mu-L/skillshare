#!/usr/bin/env bash
# Ensure the Agent CLIs that plugin work drives (claude, codex, pi) exist in the
# devcontainer, so installs can be verified against the real clients.
# Packages live on the dev-home volume and survive image rebuilds; only the
# /usr/local/bin links are container-local, so they are re-made every start.
set -euo pipefail

PREFIX="$HOME/.local/agent-clis"
# bin → npm package
declare -A PACKAGES=(
  [claude]="@anthropic-ai/claude-code"
  [codex]="@openai/codex"
  [pi]="@mariozechner/pi-coding-agent"
)

for bin in "${!PACKAGES[@]}"; do
  if [ ! -x "$PREFIX/bin/$bin" ]; then
    echo "▸ Installing $bin (${PACKAGES[$bin]}) …"
    if ! npm install -g --prefix "$PREFIX" --no-fund --no-audit "${PACKAGES[$bin]}" >/dev/null 2>&1; then
      echo "⚠ Could not install $bin; plugin checks against it will report it missing." >&2
      continue
    fi
  fi
  ln -sf "$PREFIX/bin/$bin" "/usr/local/bin/$bin"
done
