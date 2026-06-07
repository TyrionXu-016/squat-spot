import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import type { AppConfig } from "./config/env.js";
import { loadConfig } from "./config/env.js";
import { PgRepository } from "./db/pgRepository.js";
import type { AppRepository } from "./db/repository.js";
import { authenticatePlugin } from "./plugins/authenticate.js";
import { authRoutes } from "./routes/auth.js";
import { checkinRoutes } from "./routes/checkins.js";
import { statsRoutes } from "./routes/stats.js";
import { tagRoutes } from "./routes/tags.js";

interface BuildAppOptions {
  config?: Partial<AppConfig>;
  repository?: AppRepository;
}

export function buildApp(options: BuildAppOptions = {}) {
  const config = loadConfig(options.config);
  const repository = options.repository ?? new PgRepository(config.DATABASE_URL);
  const app = Fastify({
    logger: config.NODE_ENV !== "test"
  });

  app.decorate("repository", repository);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "bad_request",
        message: "Request validation failed",
        issues: error.issues
      });
    }

    app.log.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return reply.code(500).send({
      error: "internal_server_error",
      message: config.NODE_ENV === "production" ? "Internal server error" : message
    });
  });

  app.register(cors, {
    origin: config.CORS_ORIGIN === "*" ? true : config.CORS_ORIGIN
  });
  app.register(authenticatePlugin(config));
  app.register(authRoutes(repository, config), { prefix: "/api" });
  app.register(checkinRoutes(repository), { prefix: "/api" });
  app.register(statsRoutes(repository), { prefix: "/api" });
  app.register(tagRoutes(repository), { prefix: "/api" });

  app.addHook("onClose", async () => {
    await repository.close?.();
  });

  app.get("/health", async () => ({ ok: true }));

  return app;
}
