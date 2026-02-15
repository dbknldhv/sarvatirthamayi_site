#!/bin/bash
# Move to project root
cd /var/www/sarvatirthamayi/stm-mern/

echo "🔄 Pulling code from GitHub..."
git pull origin main

echo "📦 Updating Backend..."
cd backend && npm install
pm2 restart stm-api --update-env

echo "🏗️ Updating Frontend..."
cd ../frontend
# If you don't need to npm install every time, you can comment this out
npm install 
npm run build

echo "🚀 SITE UPDATED SUCCESSFULLY!"
pm2 status