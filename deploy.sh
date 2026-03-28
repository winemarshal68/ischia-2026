#!/bin/zsh
# Usage: ./deploy.sh "Your commit message"
# Commits, pushes to GitHub, and deploys to Cloudflare Pages

MSG=${1:-"Update itinerary"}
cd /Users/marshalwalker/Projects/ischia-2026

git add -A
git commit -m "$MSG"
git push origin main

echo ""
echo "✅ Pushed to GitHub → github.com/winemarshal68/ischia-2026"
echo "🚀 Deploying to Cloudflare Pages..."

wrangler pages deploy . --project-name ischia-2026 --branch main --commit-dirty=true 2>&1 | tail -4

echo ""
echo "🌊 Live at → https://ischia-2026.pages.dev"
