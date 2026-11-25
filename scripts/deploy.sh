#!/usr/bin/env bash
# Build for GitHub Pages (served at /tesseract/) and publish dist/ to the gh-pages branch.
set -euo pipefail
cd "$(dirname "$0")/.."
npx tsc -b
npx vite build --base=/tesseract/
touch dist/.nojekyll            # keep folders like items/*/_web (Jekyll would drop underscores)
cp dist/index.html dist/404.html
REMOTE=$(git remote get-url origin)
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%MZ)"
git push -q -f "$REMOTE" gh-pages
rm -rf .git
echo "Deployed → https://thomas-jichen.github.io/tesseract/"
