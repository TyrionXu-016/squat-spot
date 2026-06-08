# 部署说明

## Vercel API

后端入口是根目录的 `api` route shims，公共 handler 在 `vercel/fastify.ts`。Vercel 会把 `/api/*` 请求交给同一套 Fastify API。

## 必要环境变量

在 Vercel Project Settings 或 CLI 中配置：

```bash
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require&uselibpqcompat=true
DATABASE_POOL_MAX=5
JWT_SECRET=<random-long-secret>
JWT_EXPIRES_IN=30d
WECHAT_MOCK_LOGIN=false
WECHAT_APP_ID=<wechat-mini-program-app-id>
WECHAT_APP_SECRET=<wechat-mini-program-app-secret>
CORS_ORIGIN=*
NODE_ENV=production
```

当前 Supabase project ref 是 `rbdguylxavbfxgniudmc`。数据库密码在本机 `supabase/.temp/remote-db-password`，不要提交到 Git。

代码会兼容旧的 `?sslmode=require` 写法，运行时自动补上 `uselibpqcompat=true`，避免 Vercel 上连接 Supabase pooler 时触发证书链校验错误。

## CLI 部署流程

```bash
npm run api:build
npm run api:test
npm run vercel:check
vercel link
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add WECHAT_MOCK_LOGIN production
vercel env add WECHAT_APP_ID production
vercel env add WECHAT_APP_SECRET production
vercel --prod
```

没有微信真实 AppID/Secret 前，可以只做 preview 测试，并临时把 preview 的 `WECHAT_MOCK_LOGIN` 设为 `true`。正式上线前必须关闭。

## 验证

```bash
curl https://<your-vercel-domain>/api/health
curl -X POST https://<your-vercel-domain>/api/auth/wechat-login \
  -H 'content-type: application/json' \
  -d '{"code":"dev-code"}'
```

如果用真实微信登录，第二个请求的 `code` 必须来自 `wx.login`。

## 小程序

小程序会按环境自动选择 API 地址：

- 默认：`https://squat.tyrion.space/api`
- 如需本地联调 Fastify：先运行 `npm run api:dev`，再将 `miniapp/app.js` 里的 `USE_LOCAL_API_IN_DEVELOP` 改为 `true`

微信正式版还需要在微信公众平台配置 `request 合法域名`。

当前 Vercel 自定义域名需要在 DNS 服务商处添加：

```text
A    squat    76.76.21.21
```
