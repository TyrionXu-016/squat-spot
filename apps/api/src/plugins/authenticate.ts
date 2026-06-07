import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { AppConfig } from "../config/env.js";
import { verifyAuthToken } from "../services/jwt.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }

  interface FastifyRequest {
    user?: {
      id: string;
      openid: string;
    };
  }
}

export function authenticatePlugin(config: AppConfig): FastifyPluginAsync {
  return fp(async (app) => {
    app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
      const header = request.headers.authorization;
      const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

      if (!token) {
        await reply.code(401).send({ error: "unauthorized", message: "Missing bearer token" });
        return;
      }

      try {
        const payload = verifyAuthToken(token, config);
        request.user = {
          id: payload.sub,
          openid: payload.openid
        };
      } catch {
        await reply.code(401).send({ error: "unauthorized", message: "Invalid bearer token" });
      }
    });
  });
}
