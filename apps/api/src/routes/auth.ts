import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config/env.js";
import type { AppRepository } from "../db/repository.js";
import { signAuthToken } from "../services/jwt.js";
import { resolveWechatOpenid } from "../services/wechat.js";

const loginSchema = z.object({
  code: z.string().min(1)
});

export function authRoutes(repository: AppRepository, config: AppConfig): FastifyPluginAsync {
  return async (app) => {
    app.post("/auth/wechat-login", async (request, reply) => {
      const body = loginSchema.parse(request.body);
      const openid = await resolveWechatOpenid(body.code, config);
      const user = await repository.upsertUserByOpenid(openid);
      const token = signAuthToken({ sub: user.id, openid: user.openid }, config);
      return reply.send({ token, user: { id: user.id, openid: user.openid } });
    });
  };
}
