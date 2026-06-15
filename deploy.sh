#!/usr/bin/env bash
# ============================================
#  titancore-mirror 一键部署（lotusscom.my 替换 Lotus/Neoflam）
#
#  默认配置:
#    目录: /app/titancore-mirror
#    PM2:  titancore
#    端口: 3000
#    域名: lotusscom.my
#
#  用法:
#    curl -fsSL https://raw.githubusercontent.com/Rshijituan-baozi/titancore-mirror/main/deploy.sh | sudo bash
#
#  可选覆盖:
#    DOMAIN=lotusscom.my PORT=3000 sudo -E bash deploy.sh
#    EXTRA_DOMAINS="titancore.my www.titancore.my other.com www.other.com" sudo -E bash deploy.sh
# ============================================
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/app}"
APP_NAME="${APP_NAME:-titancore}"
OLD_APP_NAMES="${OLD_APP_NAMES:-lotus neoflam}"
REPO="${REPO:-https://github.com/Rshijituan-baozi/titancore-mirror.git}"
DOMAIN="${DOMAIN:-lotusscom.my}"
PORT="${PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-9528}"
NODE_MAJOR="${NODE_MAJOR:-20}"
PROJECT_DIR="$APP_DIR/titancore-mirror"
TARGET_URL="${TARGET_URL:-https://shop-titancore.com}"
PUBLIC_HOST="${PUBLIC_HOST:-www.lotusscom.my}"
EXTRA_DOMAINS="${EXTRA_DOMAINS:-titancore.my www.titancore.my}"

if [ "$(id -u)" -ne 0 ]; then
  echo "请用 root 执行，例如: curl -fsSL <deploy.sh> | sudo bash"
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "当前脚本只支持 Ubuntu/Debian 系统。"
  exit 1
fi

echo "========================================"
echo "  titancore-mirror 一键部署"
echo "  目录: $PROJECT_DIR"
echo "  PM2:  $APP_NAME"
echo "  端口: $PORT"
echo "  域名: $DOMAIN"
echo "  源站: $TARGET_URL"
echo "========================================"

echo "[1/7] 安装系统依赖..."
apt-get update -qq
apt-get install -y -qq curl git nginx ca-certificates >/dev/null

if ! command -v node >/dev/null 2>&1; then
  echo "[2/7] 安装 Node.js $NODE_MAJOR..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs >/dev/null
else
  echo "[2/7] Node.js 已安装: $(node -v)"
fi

echo "[3/7] 安装 PM2..."
npm install -g pm2 >/dev/null

echo "[4/8] 停掉旧进程并释放端口 $PORT..."
stop_pm2_name() {
  local name="$1"
  pm2 stop "$name" >/dev/null 2>&1 || true
  pm2 delete "$name" >/dev/null 2>&1 || true
}
for old in $OLD_APP_NAMES; do
  stop_pm2_name "$old"
done
# ubuntu 用户可能另有 PM2 实例（deploy 用 root 时 lotus 仍会占 3000）
if id ubuntu >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
  for old in $OLD_APP_NAMES; do
    sudo -u ubuntu env PM2_HOME=/home/ubuntu/.pm2 pm2 stop "$old" >/dev/null 2>&1 || true
    sudo -u ubuntu env PM2_HOME=/home/ubuntu/.pm2 pm2 delete "$old" >/dev/null 2>&1 || true
  done
fi
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
  sleep 1
fi

echo "[5/8] 拉取代码并安装依赖..."
mkdir -p "$APP_DIR"
if [ -d "$PROJECT_DIR/.git" ]; then
  git -C "$PROJECT_DIR" pull origin main
else
  rm -rf "$PROJECT_DIR"
  git clone "$REPO" "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"
if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

cat > "$PROJECT_DIR/.env" <<EOF
PORT=$PORT
TARGET_URL=$TARGET_URL
PUBLIC_HOST=$PUBLIC_HOST
ADMIN_API_BASE=http://127.0.0.1:$BACKEND_PORT
EOF

echo "[6/8] 启动 PM2 服务..."
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start "$PROJECT_DIR/src/index.js" --name "$APP_NAME" --cwd "$PROJECT_DIR" --update-env
fi
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

sleep 2
if ss -tlnp 2>/dev/null | grep ":${PORT} " | grep -qE 'titan|titancore'; then
  echo "  ✓ 端口 $PORT 已由 titancore 监听"
elif ss -tlnp 2>/dev/null | grep ":${PORT} " | grep -q lotus; then
  echo "错误: 端口 $PORT 仍被 lotus 占用"
  ss -tlnp | grep ":${PORT} " || true
  exit 1
fi

echo "[7/8] 配置 Nginx..."
if [ "$DOMAIN" = "_" ]; then
  SERVER_NAME="_"
  PUBLIC_URL="http://服务器IP/"
else
  SERVER_NAME="$DOMAIN www.$DOMAIN $EXTRA_DOMAINS"
  PUBLIC_URL="https://www.$DOMAIN/"
fi

cat > /etc/nginx/sites-available/titancore <<NGINX
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

rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/lotus
rm -f /etc/nginx/sites-enabled/neoflam
ln -sf /etc/nginx/sites-available/titancore /etc/nginx/sites-enabled/titancore
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl reload nginx

echo "[8/8] 配置 Caddy（若存在，HTTPS 回源走此层）..."
if [ -f "$PROJECT_DIR/scripts/fix-caddy-origin.sh" ]; then
  bash "$PROJECT_DIR/scripts/fix-caddy-origin.sh"
else
  echo "  未找到 fix-caddy-origin.sh，跳过"
fi

echo ""
echo "  本机验证:"
if curl -fsS "http://127.0.0.1:$PORT/" 2>/dev/null | grep -qi 'isShopifyCheckoutUrl\|TITANCORE_HOST_RE\|PFAS'; then
  echo "  ✓ :$PORT titancore 响应正常"
else
  echo "  ! :$PORT 本机验证未命中关键字（若外网已正常可忽略），请: pm2 logs $APP_NAME --lines 30"
fi
if curl -fsS -H "Host: www.$DOMAIN" "http://127.0.0.1/" 2>/dev/null | grep -qi 'isShopifyCheckoutUrl\|TITANCORE_HOST_RE\|PFAS'; then
  echo "  ✓ Nginx → titancore 正常"
else
  echo "  ! Nginx 层本机验证未命中（外网可用则忽略）"
fi

echo ""
echo "========================================"
echo "  部署完成"
echo "  访问: $PUBLIC_URL"
echo "  产品: $PUBLIC_URL/products/hybrid-pots-pans-set-12-pc"
echo "  目录: $PROJECT_DIR"
echo "  日志: pm2 logs $APP_NAME"
echo "  提示: 若走 Cloudflare，请 Purge Cache"
echo "========================================"
