#!/usr/bin/env bash
# Blocks direct commits/pushes on protected branches. Wired in as both a
# pre-commit and a pre-push hook via .pre-commit-config.yaml.
set -euo pipefail

protected_branches="^(main|master)$"
branch="$(git symbolic-ref --short HEAD 2>/dev/null || echo "")"

if [[ "$branch" =~ $protected_branches ]]; then
  if [[ "${ALLOW_MAIN_COMMIT:-0}" == "1" ]]; then
    echo "⚠️  ALLOW_MAIN_COMMIT=1 set — allowing direct action on '$branch'."
    exit 0
  fi
  echo "✖ Direct commits/pushes to '$branch' are blocked."
  echo "  Create a feature branch instead:"
  echo "    git checkout -b your-feature-branch"
  echo "  (Emergency override: ALLOW_MAIN_COMMIT=1 git commit/push ...)"
  exit 1
fi

exit 0
