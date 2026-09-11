#!/usr/bin/env bash
# Deploy dist/ to SiteGround (eatdanville.com) over SSH. Usage: bash scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
KEY="$HOME/.ssh/siteground_eatdanville"
HOST="u2455-bngunpajjhlx@gcam1304.siteground.biz"
PORT=18765
REMOTE="www/eatdanville.com/public_html"
node scripts/build.mjs
tar -C dist -czf /tmp/eatdanville-dist.tgz .
scp -i "$KEY" -P $PORT /tmp/eatdanville-dist.tgz "$HOST:/tmp/eatdanville-dist.tgz"
ssh -i "$KEY" -p $PORT "$HOST" "set -e; mkdir -p $REMOTE ~/www/eatdanville.com/private; cd $REMOTE; rm -rf ./* ./.htaccess 2>/dev/null || true; tar -xzf /tmp/eatdanville-dist.tgz; rm /tmp/eatdanville-dist.tgz; chmod 700 ~/www/eatdanville.com/private; ls -la | head -20"
echo "Deployed to https://eatdanville.com"
