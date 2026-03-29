#!/bin/zsh
# Ischia 2026 — deploy to pedalonpedaloff.com
# Usage: ./deploy.sh "your commit message"
# GitHub is now connected to Cloudflare Pages (ischia-2026-new)
# so git push IS all you need — Cloudflare auto-deploys within ~30 seconds.

MSG=${1:-"Update itinerary"}
cd /Users/marshalwalker/Projects/ischia-2026

git add -A
git commit -m "$MSG"
git push origin main

echo ""
echo "✅ Pushed to GitHub — Cloudflare will auto-deploy in ~30 seconds"
echo "🌊 Live at → https://pedalonpedaloff.com"
