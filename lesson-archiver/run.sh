#!/bin/bash
# Wrapper used by launchd, which does not inherit your shell environment and
# needs absolute paths. Keeps the plists free of machine-specific details.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

# launchd starts jobs with PATH=/usr/bin:/bin:/usr/sbin:/sbin, which excludes
# every place the Claude Code CLI installs itself. Without this the classifier
# works when you run it by hand and silently degrades when scheduled.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

if [ -d "$HERE/.venv" ]; then
  # shellcheck disable=SC1091
  source "$HERE/.venv/bin/activate"
fi

mkdir -p "$HERE/logs"
exec python3 -m archiver.cli "$@" >> "$HERE/logs/archiver.log" 2>&1
