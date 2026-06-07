import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { MemoryRepository } from "../src/db/memoryRepository.js";

async function login(app: ReturnType<typeof buildApp>) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/wechat-login",
    payload: { code: "dev-code" }
  });
  expect(response.statusCode).toBe(200);
  return response.json<{ token: string; user: { id: string; openid: string } }>();
}

describe("Squat Spot API", () => {
  it("requires bearer auth for private endpoints", async () => {
    const app = buildApp({
      repository: new MemoryRepository(),
      config: { NODE_ENV: "test", JWT_SECRET: "test-secret-key" }
    });

    const response = await app.inject({ method: "GET", url: "/api/checkins" });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("does not use mock login when mock mode is disabled", async () => {
    const app = buildApp({
      repository: new MemoryRepository(),
      config: { NODE_ENV: "test", JWT_SECRET: "test-secret-key", WECHAT_MOCK_LOGIN: false }
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/wechat-login",
      payload: { code: "dev-code" }
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().message).toBe("WeChat credentials are required when mock login is disabled");
    await app.close();
  });

  it("creates checkins, lists records, returns map points and updates stats", async () => {
    const app = buildApp({
      repository: new MemoryRepository(),
      config: { NODE_ENV: "test", JWT_SECRET: "test-secret-key" }
    });
    const { token, user } = await login(app);
    expect(user.openid).toBe("mock_dev-code");

    const noneLocation = await app.inject({
      method: "POST",
      url: "/api/checkins",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        status: "smooth",
        tags: ["顺畅", "家里"],
        note: "早上状态不错，出发前记录一下。",
        locationMode: "none",
        placeName: "家里"
      }
    });

    expect(noneLocation.statusCode).toBe(201);
    expect(noneLocation.json().checkin.lat).toBeNull();

    const fuzzyLocation = await app.inject({
      method: "POST",
      url: "/api/checkins",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        status: "normal",
        tags: ["一般", "咖啡后"],
        locationMode: "fuzzy",
        lat: 39.904211,
        lng: 116.407395,
        placeName: "望京"
      }
    });

    expect(fuzzyLocation.statusCode).toBe(201);
    const fuzzy = fuzzyLocation.json().checkin;
    expect(fuzzy.lat).toBe(39.9);
    expect(fuzzy.lng).toBe(116.41);

    const list = await app.inject({
      method: "GET",
      url: "/api/checkins",
      headers: { authorization: `Bearer ${token}` }
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().checkins).toHaveLength(2);

    const map = await app.inject({
      method: "GET",
      url: "/api/checkins/map?range=all",
      headers: { authorization: `Bearer ${token}` }
    });
    expect(map.statusCode).toBe(200);
    expect(map.json().markers).toHaveLength(1);

    const stats = await app.inject({
      method: "GET",
      url: "/api/stats/summary",
      headers: { authorization: `Bearer ${token}` }
    });
    expect(stats.statusCode).toBe(200);
    expect(stats.json().summary.totalCount).toBe(2);
    expect(["家里", "望京"]).toContain(stats.json().summary.favoritePlace);

    const deletedId = list.json().checkins[0].id;
    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/checkins/${deletedId}`,
      headers: { authorization: `Bearer ${token}` }
    });
    expect(deleted.statusCode).toBe(204);

    const afterDelete = await app.inject({
      method: "GET",
      url: "/api/checkins",
      headers: { authorization: `Bearer ${token}` }
    });
    expect(afterDelete.json().checkins).toHaveLength(1);

    await app.close();
  });

  it("rejects invalid location payloads", async () => {
    const app = buildApp({
      repository: new MemoryRepository(),
      config: { NODE_ENV: "test", JWT_SECRET: "test-secret-key" }
    });
    const { token } = await login(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/checkins",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        status: "hard",
        tags: ["艰难"],
        locationMode: "precise"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("bad_request");

    await app.close();
  });
});
