import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { AppRepository } from "../db/repository.js";

const statusSchema = z.enum(["smooth", "normal", "hard"]);
const locationModeSchema = z.enum(["none", "fuzzy", "precise"]);
const rangeSchema = z.enum(["today", "week", "month", "all"]);

const createCheckinSchema = z
  .object({
    status: statusSchema,
    tags: z.array(z.string().trim().min(1).max(16)).max(8).default([]),
    note: z.string().max(240).optional().nullable(),
    locationMode: locationModeSchema,
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    placeName: z.string().max(120).optional().nullable(),
    checkedAt: z.string().datetime().optional()
  })
  .superRefine((value, context) => {
    if (value.locationMode !== "none" && (typeof value.lat !== "number" || typeof value.lng !== "number")) {
      context.addIssue({
        code: "custom",
        path: ["lat"],
        message: "lat and lng are required when locationMode is fuzzy or precise"
      });
    }
  });

const listQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  tag: z.string().optional(),
  range: rangeSchema.optional()
});

const idParamsSchema = z.object({
  id: z.string().uuid()
});

export function checkinRoutes(repository: AppRepository): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.post("/checkins", async (request, reply) => {
      const body = createCheckinSchema.parse(request.body);
      const checkin = await repository.createCheckin(request.user!.id, body);
      return reply.code(201).send({ checkin });
    });

    app.get("/checkins", async (request) => {
      const query = listQuerySchema.parse(request.query);
      const checkins = await repository.listCheckins(request.user!.id, query);
      return { checkins };
    });

    app.get("/checkins/map", async (request) => {
      const query = z.object({ range: rangeSchema.optional() }).parse(request.query);
      const markers = await repository.getMapPoints(request.user!.id, query.range);
      return { markers };
    });

    app.get("/checkins/:id", async (request, reply) => {
      const params = idParamsSchema.parse(request.params);
      const checkin = await repository.getCheckin(request.user!.id, params.id);
      if (!checkin) {
        return reply.code(404).send({ error: "not_found", message: "Checkin not found" });
      }
      return { checkin };
    });

    app.delete("/checkins/:id", async (request, reply) => {
      const params = idParamsSchema.parse(request.params);
      const deleted = await repository.deleteCheckin(request.user!.id, params.id);
      if (!deleted) {
        return reply.code(404).send({ error: "not_found", message: "Checkin not found" });
      }
      return reply.code(204).send();
    });
  };
}
