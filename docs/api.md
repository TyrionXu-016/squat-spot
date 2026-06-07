# 蹲点儿 API 契约

Base URL：

- 本地开发：`http://127.0.0.1:3000/api`
- Vercel 预览/生产：`https://<your-vercel-domain>/api`
- 微信正式版：建议使用自己的 HTTPS 域名，如 `https://api.example.com/api`

所有私有接口使用：

```http
Authorization: Bearer <token>
```

## 登录

### POST `/auth/wechat-login`

请求：

```json
{
  "code": "wx.login 返回的 code"
}
```

开发期 `WECHAT_MOCK_LOGIN=true` 时，后端会返回 `mock_<code>` openid。

生产环境应配置 `WECHAT_MOCK_LOGIN=false`、`WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`。

响应：

```json
{
  "token": "jwt",
  "user": {
    "id": "uuid",
    "openid": "openid"
  }
}
```

## 打卡

### POST `/checkins`

请求：

```json
{
  "status": "smooth",
  "tags": ["顺畅", "家里"],
  "note": "早上状态不错，出发前记录一下。",
  "locationMode": "none",
  "placeName": "家里",
  "checkedAt": "2026-06-07T06:42:00.000Z"
}
```

`status`：

- `smooth`：顺畅
- `normal`：一般
- `hard`：艰难

`locationMode`：

- `none`：不保存经纬度
- `fuzzy`：后端把坐标四舍五入到 2 位小数
- `precise`：后端保留 6 位小数

`fuzzy` / `precise` 必须传 `lat` 和 `lng`。

响应：

```json
{
  "checkin": {
    "id": "uuid",
    "status": "smooth",
    "tags": ["顺畅", "家里"],
    "locationMode": "none",
    "lat": null,
    "lng": null,
    "checkedAt": "2026-06-07T06:42:00.000Z"
  }
}
```

### GET `/checkins`

查询参数：

- `month=YYYY-MM`
- `tag=家里`
- `range=today|week|month|all`

响应：

```json
{
  "checkins": []
}
```

### GET `/checkins/:id`

返回单条记录详情。

### DELETE `/checkins/:id`

软删除记录，成功返回 `204`。

## 地图

### GET `/checkins/map?range=today|week|month|all`

只返回带位置的记录。

响应：

```json
{
  "markers": [
    {
      "id": "uuid",
      "status": "normal",
      "latitude": 39.9,
      "longitude": 116.41,
      "title": "望京",
      "locationMode": "fuzzy",
      "checkedAt": "2026-06-07T06:42:00.000Z"
    }
  ]
}
```

## 统计

### GET `/stats/summary`

响应：

```json
{
  "summary": {
    "totalCount": 18,
    "monthCount": 7,
    "streakDays": 3,
    "favoritePlace": "家里",
    "lastCheckinAt": "2026-06-07T06:42:00.000Z"
  }
}
```

## 标签

### GET `/tags`

响应：

```json
{
  "tags": [
    {
      "id": "uuid",
      "name": "顺畅",
      "slug": "smooth",
      "userId": null,
      "sortOrder": 10
    }
  ]
}
```

## 本地联调

1. `supabase start`
2. `supabase db reset`
3. `cp apps/api/.env.example apps/api/.env`
4. `npm run api:dev`
5. 微信开发者工具打开 `miniapp`
6. 开启“不校验合法域名”
