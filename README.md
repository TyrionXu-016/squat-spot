# 蹲点儿 / Squat Spot

微信小程序全栈骨架：原生小程序 + Fastify API + Supabase Postgres/PostGIS。

## 目录

- `supabase/migrations`：数据库 schema 源头。
- `apps/api`：Node.js Fastify API。
- `miniapp`：原生微信小程序。
- `docs/api.md`：接口契约与联调说明。
- `api` / `vercel`：Vercel Functions 入口，复用 Fastify API。

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

## Supabase 云项目

当前已创建并链接：

- Project：`squat-spot`
- Project ref：`rbdguylxavbfxgniudmc`
- Region：Tokyo / `ap-northeast-1`

推送数据库 schema：

```bash
supabase db push
```

数据库密码保存在本机 `supabase/.temp/remote-db-password`，该目录已被 Git 忽略。

## Vercel 部署

后端 API 可部署到 Vercel Functions。需要配置的环境变量见 [docs/deploy.md](docs/deploy.md)。

本地检查：

```bash
npm run api:build
npm run api:test
npm run vercel:check
```

## 当前边界

- 小程序不直连 Supabase 表数据。
- 本地开发默认使用 mock openid；生产环境需要配置 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`。
- 线上自定义域名、微信审核不在本阶段内。
