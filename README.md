# 蹲点儿 / Squat Spot

微信小程序全栈骨架：原生小程序 + Fastify API + Supabase Postgres/PostGIS。

## 目录

- `supabase/migrations`：数据库 schema 源头。
- `apps/api`：Node.js Fastify API。
- `miniapp`：原生微信小程序。
- `docs/api.md`：接口契约与联调说明。

## 本地开发

1. 安装依赖：

```bash
npm install
```

2. 安装并启动 Supabase CLI：

```bash
brew install supabase/tap/supabase
supabase start
supabase db reset
```

3. 配置 API：

```bash
cp apps/api/.env.example apps/api/.env
npm run api:dev
```

4. 使用微信开发者工具打开 `miniapp`。

开发环境的小程序 API 地址默认为 `http://127.0.0.1:3000/api`。在微信开发者工具中需要开启“不校验合法域名”。

## 当前边界

- 小程序不直连 Supabase 表数据。
- 微信登录默认使用 mock openid；配置 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET` 后可接真实 `jscode2session`。
- Nginx、HTTPS、线上域名、微信审核不在本阶段内。
