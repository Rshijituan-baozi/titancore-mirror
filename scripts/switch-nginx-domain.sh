#!/usr/bin/env bash
# 一键把 titancore Nginx 改成指定域名（默认 titancore.my），无需 nano
# 用法: sudo bash scripts/switch-nginx-domain.sh
#       sudo DOMAIN=titancore.my PORT=3000 BACKEND_PORT=9528 bash scripts/switch-nginx-domain.sh
set -euo pipefail

DOMAIN="${DOMAIN:-titancore.my}"
PORT="${PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-9528}"
NGINX_FILE="${NGINX_FILE:-/etc/nginx/sites-available/titancore}"

if [ "$(id -u)" -ne 0 ]; then
  echo "请用 root 执行: sudo bash scripts/switch-nginx-domain.sh"
  exit 1
fi

SERVER_NAME="$DOMAIN www.$DOMAIN"
if [ -n "${EXTRA_DOMAINS:-}" ]; then
  SERVER_NAME="$SERVER_NAME $EXTRA_DOMAINS"
fi

echo "写入 Nginx: $NGINX_FILE"
echo "  server_name $SERVER_NAME;"

cat > "$NGINX_FILE" <<NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $SERVER_NAME;

    client_max_body_size 20m;

    location = /api/settings {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header Authorization \$http_authorization;
        proxy_read_timeout 120s;
    }

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
NGINX

ln -sf "$NGINX_FILE" /etc/nginx/sites-enabled/titancore
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t
systemctl reload nginx

echo "OK: Nginx 已切换为 $SERVER_NAME"
