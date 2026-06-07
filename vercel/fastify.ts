import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../apps/api/src/app.js";

let appPromise: Promise<FastifyInstance> | undefined;

async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    const app = buildApp();
    appPromise = (async () => {
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
