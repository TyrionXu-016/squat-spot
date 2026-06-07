import jwt from "jsonwebtoken";
import type { AppConfig } from "../config/env.js";

export interface AuthTokenPayload {
  sub: string;
  openid: string;
}

export function signAuthToken(payload: AuthTokenPayload, config: AppConfig): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  } as jwt.SignOptions);
}

export function verifyAuthToken(token: string, config: AppConfig): AuthTokenPayload {
  const payload = jwt.verify(token, config.JWT_SECRET);
  if (typeof payload !== "object" || !payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid token payload");
  }
  return {
    sub: payload.sub,
    openid: typeof payload.openid === "string" ? payload.openid : ""
  };
}
