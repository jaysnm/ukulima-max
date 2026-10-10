#!/usr/bin/env bash
# One-time setup for server-side branch protection on GitHub.
#
# Local git hooks (see .pre-commit-config.yaml / scripts/hooks/no-direct-main.sh)
# stop *your own* accidental commits/pushes to main, but they live on your
# machine only — anyone else's clone, or a `--no-verify` push, ignores them.
# Real protection has to be enforced by GitHub itself. Run this once you have
# a GitHub remote and the `gh` CLI authenticated (`gh auth login`).
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "✖ GitHub CLI (gh) not found. Install it: https://cli.github.com/" >&2
  exit 1
fi

repo="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
if [[ -z "$repo" ]]; then
  echo "✖ No GitHub remote detected for this repo (or gh is not authenticated)." >&2
  echo "  Run 'gh auth login' and make sure 'origin' points at a GitHub repo." >&2
  exit 1
fi

branch="${1:-main}"

echo "Applying branch protection to $repo:$branch ..."
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "repos/$repo/branches/$branch/protection" \
  -f "required_status_checks=null" \
  -F "enforce_admins=true" \
  -F "required_pull_request_reviews[required_approving_review_count]=1" \
  -F "restrictions=null" \
  -F "allow_force_pushes=false" \
  -F "allow_deletions=false"

echo "✔ Branch '$branch' now requires PRs (no direct pushes, no force-push, no deletion)."
