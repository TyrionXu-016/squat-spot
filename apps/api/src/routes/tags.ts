import type { FastifyPluginAsync } from "fastify";
import type { AppRepository } from "../db/repository.js";

export function tagRoutes(repository: AppRepository): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.get("/tags", async (request) => {
      const tags = await repository.listTags(request.user!.id);
      return { tags };
    });
  };
}
