import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { FastifyInstance } from "fastify";

let appPromise: Promise<FastifyInstance> | undefined;

async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = (async () => {
      const { buildApp } = await import("../apps/api/src/app.js");
      const app = buildApp();
      await app.ready();
      return app;
    })();
  }

  return appPromise;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const app = await getApp();

  await new Promise<void>((resolve, reject) => {
    response.once("finish", resolve);
    response.once("error", reject);
    app.server.emit("request", request, response);
  });
}
