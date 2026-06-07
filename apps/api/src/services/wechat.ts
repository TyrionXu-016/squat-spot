import type { AppConfig } from "../config/env.js";

interface WechatSessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export async function resolveWechatOpenid(code: string, config: AppConfig): Promise<string> {
  if (config.WECHAT_MOCK_LOGIN || !config.WECHAT_APP_ID || !config.WECHAT_APP_SECRET) {
    return `mock_${code || "dev"}`;
  }

  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", config.WECHAT_APP_ID);
  url.searchParams.set("secret", config.WECHAT_APP_SECRET);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`WeChat jscode2session failed with ${response.status}`);
  }

  const payload = (await response.json()) as WechatSessionResponse;
  if (!payload.openid) {
    throw new Error(payload.errmsg || "WeChat did not return openid");
  }

  return payload.openid;
}
