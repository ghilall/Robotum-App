#!/bin/bash

# Update Application Script
echo "🔄 Updating Robotum App..."

cd /var/www/robotum-app

# Pull latest changes (if using git)
# git pull origin main

# Install/update dependencies
npm install

# Restart the application
pm2 restart robotum-app

echo "✅ Application updated and restarted!"