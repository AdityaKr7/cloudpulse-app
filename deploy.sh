#!/usr/bin/env bash
# ==============================================================================
# CloudPulse - Automated Deployment Script for AWS EC2 Ubuntu
# ==============================================================================
set -e

echo "🚀 [1/5] Starting CloudPulse deployment..."

# Ensure we are in the application root directory
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "📂 Working directory: $APP_DIR"

# Step 2: Fetch and install production dependencies
echo "📦 [2/5] Installing production npm dependencies..."
npm install --omit=dev

# Step 3: Ensure logs directory exists
mkdir -p logs

# Step 4: Check if PM2 is running the app, otherwise start it
echo "⚡ [3/5] Reloading PM2 process with zero downtime..."
if pm2 describe cloudpulse-app > /dev/null 2>&1; then
    echo "🔄 Existing PM2 process found. Reloading..."
    pm2 reload ecosystem.config.cjs --env production
else
    echo "🌟 Starting fresh PM2 process..."
    pm2 start ecosystem.config.cjs --env production
fi

# Step 5: Save PM2 process list to resurrect on server reboot
echo "💾 [4/5] Saving PM2 state..."
pm2 save

# Step 6: Verify health check
echo "🔍 [5/5] Performing health check..."
sleep 2
HEALTH_STATUS=$(curl -s http://127.0.0.1:5000/api/health || echo "FAILED")

if [[ "$HEALTH_STATUS" =~ "healthy" ]]; then
    echo "✅ DEPLOYMENT SUCCESSFUL! CloudPulse is live and healthy."
    echo "$HEALTH_STATUS"
else
    echo "❌ Health check failed! Check logs using: pm2 logs cloudpulse-app"
    exit 1
fi
