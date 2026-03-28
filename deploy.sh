#!/bin/zsh
# Ischia 2026 — deploy to Cloudflare Pages
# Usage: ./deploy.sh "your commit message"
# NOTE: git push alone does NOT update the website.
#       Always run this script OR the wrangler command below.

MSG=${1:-"Update itinerary"}
cd /Users/marshalwalker/Projects/ischia-2026

git add -A
git commit -m "$MSG"
git push origin main

echo ""
echo "🚀 Deploying to Cloudflare Pages..."
wrangler pages deploy . --project-name ischia-2026 --branch main --commit-dirty=true 2>&1 | tail -4

echo ""
echo "✅ Live at → https://ischia-2026.pages.dev"
