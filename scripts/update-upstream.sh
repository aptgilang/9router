#!/usr/bin/env bash
# ==============================================================================
# 9Router Upstream Sync & Auto-Update Engine
# Keeps custom enhancements (unredacted observability, Bun runtime, UI improvements)
# completely intact while updating to the latest upstream release (decolua/9router).
# ==============================================================================

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

UPSTREAM_URL="https://github.com/decolua/9router.git"
UPSTREAM_REMOTE="upstream"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 9Router Upstream Sync Engine"
echo "  Working branch: $BRANCH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Ensure upstream remote exists
if ! git remote | grep -q "^$UPSTREAM_REMOTE$"; then
  echo "📡 Adding upstream remote ($UPSTREAM_URL)..."
  git remote add "$UPSTREAM_REMOTE" "$UPSTREAM_URL"
else
  echo "✓ Upstream remote already configured."
fi

# 2. Fetch latest commits and tags from upstream
echo "📥 Fetching latest upstream releases and tags..."
git fetch "$UPSTREAM_REMOTE" master --tags -q

LATEST_TAG="$(git describe --tags --abbrev=0 "$UPSTREAM_REMOTE/master" 2>/dev/null || echo "master")"
CURRENT_COMMIT="$(git rev-parse --short HEAD)"
UPSTREAM_COMMIT="$(git rev-parse --short "$UPSTREAM_REMOTE/master")"

echo "📌 Current commit:  $CURRENT_COMMIT"
echo "📌 Upstream target:  $UPSTREAM_COMMIT ($LATEST_TAG)"

# Check if current branch already contains upstream commit
if git merge-base --is-ancestor "$UPSTREAM_REMOTE/master" HEAD 2>/dev/null; then
  echo "✅ Already up-to-date with upstream $LATEST_TAG!"
  exit 0
fi

# 3. Safety check: ensure clean working tree
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️ Working tree has uncommitted changes. Stashing them..."
  git stash push -u -m "pre-upstream-sync-$(date +%s)"
  STASHED=1
fi

# 4. Create safety backup branch
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_BRANCH="backup/pre-update-${TIMESTAMP}"
echo "🛡️ Creating local safety backup branch: $BACKUP_BRANCH"
git branch "$BACKUP_BRANCH"

# 5. Execute 3-way merge
echo "🔄 Merging upstream changes from $UPSTREAM_REMOTE/master..."
MERGE_MSG="chore(upstream): sync with upstream release $LATEST_TAG (commit $UPSTREAM_COMMIT)"

if git merge "$UPSTREAM_REMOTE/master" -m "$MERGE_MSG" --no-commit; then
  echo "✓ Merge applied without conflict."
else
  echo "⚠️ Resolving standard custom file overlaps..."
  
  # Auto-reconcile known files if conflict markers exist
  if git status --porcelain | grep -q "DashboardLayout.js"; then
    echo "  -> Resolving DashboardLayout.js (preserving idle preloader + mobile bottom bar)..."
    git checkout --ours src/shared/components/layouts/DashboardLayout.js 2>/dev/null || true
    git add src/shared/components/layouts/DashboardLayout.js
  fi

  if git status --porcelain | grep -q "combos/page.js"; then
    echo "  -> Resolving combos/page.js (preserving custom model fallback flow)..."
    git checkout --ours src/app/\(dashboard\)/dashboard/combos/page.js 2>/dev/null || true
    git add src/app/\(dashboard\)/dashboard/combos/page.js
  fi

  if git status --porcelain | grep -q "package.json"; then
    git checkout --ours package.json 2>/dev/null || true
    git add package.json
  fi

  # Auto-remove .github/workflows if introduced from upstream (prevents OAuth scope rejection on git push)
  if [ -d ".github/workflows" ]; then
    echo "  -> Removing .github/workflows to prevent OAuth push refusal..."
    git rm -rf .github/workflows 2>/dev/null || true
  fi
fi

# Ensure .github/workflows is not tracked
if [ -d ".github/workflows" ]; then
  git rm -rf .github/workflows 2>/dev/null || true
fi

# 6. Ensure our custom files are strictly intact
git add -A

# If merge was successful / staged, commit it
if git status --porcelain | grep -q "^[MADRCU]"; then
  git commit -m "$MERGE_MSG" || true
fi

# 7. Refresh Bun dependencies
echo "📦 Updating Bun dependencies and lockfile..."
bun install

if [ -n "$(git status --porcelain bun.lock)" ]; then
  git add bun.lock
  git commit -m "chore: update bun.lock for upstream $LATEST_TAG" || true
fi

# 8. Test build verification
echo "🔨 Verifying production build (bun run build:bun)..."
if bun run build:bun; then
  echo "✅ Build verified successfully! Zero build regressions."
else
  echo "❌ Build failed! Rolling back to safety backup..."
  git reset --hard "$BACKUP_BRANCH"
  exit 1
fi

# 9. Restore stashed changes if any
if [ "${STASHED:-0}" = "1" ]; then
  echo "📤 Restoring previously stashed local changes..."
  git stash pop || true
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 Successfully updated 9Router to $LATEST_TAG ($UPSTREAM_COMMIT)!"
echo "  To push changes to GitHub & Dokploy: git push origin $BRANCH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
