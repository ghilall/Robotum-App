#!/bin/bash

# SSL Setup Script for BirHost
echo "🔒 Setting up SSL certificate..."

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
# sudo certbot --nginx -d your-domain.com

# For IP-only access, you can use a self-signed certificate
echo "📝 Creating self-signed certificate for IP access..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/robotum-app.key \
    -out /etc/ssl/certs/robotum-app.crt \
    -subj "/C=TR/ST=Istanbul/L=Istanbul/O=Robotum/CN=46.20.7.172"

# Update Nginx for HTTPS
sudo tee /etc/nginx/sites-available/robotum-app-ssl << EOF
server {
    listen 80;
    server_name 46.20.7.172;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 46.20.7.172;

    ssl_certificate /etc/ssl/certs/robotum-app.crt;
    ssl_certificate_key /etc/ssl/private/robotum-app.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

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

    location /Public/ {
        alias /var/www/robotum-app/Public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/robotum-app-ssl /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "✅ SSL setup completed!"