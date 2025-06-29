#!/bin/bash

# BirHost Deployment Script for Robotum App
echo "🚀 Starting deployment to BirHost..."

echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install Node.js 18.x
echo "�� Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install PM2 for process management
echo "📥 Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "📥 Installing Nginx..."
sudo apt install nginx -y

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/robotum-app
sudo chown $USER:$USER /var/www/robotum-app

# Copy application files (run this from your local machine)
echo "📋 Copying application files..."
# scp -r . obs.robo_9rvjupmaqhm@46.20.7.172:/var/www/robotum-app/

# Navigate to app directory
cd /var/www/robotum-app

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Create environment file
echo "🔧 Creating environment file..."
cat > .env << EOF
NODE_ENV=production
SESSION_SECRET=robotum-secret-key-2024
DATABASE_URL=your-supabase-connection-string
DB_HOST=your-supabase-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
PORT=3000
EOF

echo "⚠️  Please update the .env file with your actual database credentials!"

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start server.js --name "robotum-app"

# Save PM2 configuration
pm2 save
pm2 startup

# Setup Nginx reverse proxy
echo "🌐 Setting up Nginx..."
sudo tee /etc/nginx/sites-available/robotum-app << EOF
server {
    listen 80;
    server_name 46.20.7.172;  # Your server IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Serve static files directly
    location /Public/ {
        alias /var/www/robotum-app/Public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/robotum-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t
sudo systemctl restart nginx

# Setup firewall
echo "🔥 Setting up firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "✅ Deployment completed!"
echo "�� Your app should be available at: http://46.20.7.172"
echo "📊 PM2 status: pm2 status"
echo "�� PM2 logs: pm2 logs robotum-app"