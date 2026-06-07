import type { FastifyPluginAsync } from "fastify";
import type { AppRepository } from "../db/repository.js";

export function statsRoutes(repository: AppRepository): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.get("/stats/summary", async (request) => {
      const summary = await repository.getStatsSummary(request.user!.id);
      return { summary };
    });
  };
}
