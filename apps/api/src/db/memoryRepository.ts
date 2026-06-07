import { randomUUID } from "node:crypto";
import type {
  Checkin,
  CheckinFilters,
  CreateCheckinInput,
  DateRange,
  MapPoint,
  StatsSummary,
  User
} from "../types/domain.js";
import { dateKey, startOfRange } from "../utils/dates.js";
import { normalizeLocation } from "../utils/location.js";
import type { AppRepository, TagRecord } from "./repository.js";

const defaultTags = ["顺畅", "一般", "艰难", "家里", "公司", "旅行中", "火锅后", "咖啡后"];

export class MemoryRepository implements AppRepository {
  private readonly users = new Map<string, User>();
  private readonly openids = new Map<string, string>();
  private readonly checkins: Checkin[] = [];
  private readonly deleted = new Set<string>();

  async upsertUserByOpenid(openid: string): Promise<User> {
    const existingId = this.openids.get(openid);
    if (existingId) {
      const user = this.users.get(existingId);
      if (!user) throw new Error("memory user index is inconsistent");
      const updated = { ...user, lastLoginAt: new Date().toISOString() };
      this.users.set(existingId, updated);
      return updated;
    }

    const now = new Date().toISOString();
    const user: User = {
      id: randomUUID(),
      openid,
      createdAt: now,
      lastLoginAt: now
    };
    this.users.set(user.id, user);
    this.openids.set(openid, user.id);
    return user;
  }

  async createCheckin(userId: string, input: CreateCheckinInput): Promise<Checkin> {
    const location = normalizeLocation(input);
    const now = new Date().toISOString();
    const checkin: Checkin = {
      id: randomUUID(),
      userId,
      status: input.status,
      tags: [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))],
      note: input.note?.trim() || null,
      locationMode: location.locationMode,
      placeName: location.placeName,
      lat: location.lat,
      lng: location.lng,
      checkedAt: input.checkedAt ? new Date(input.checkedAt).toISOString() : now,
      createdAt: now,
      updatedAt: now
    };
    this.checkins.unshift(checkin);
    return checkin;
  }

  async listCheckins(userId: string, filters: CheckinFilters = {}): Promise<Checkin[]> {
    const rangeStart = startOfRange(filters.range);
    return this.checkins
      .filter((checkin) => checkin.userId === userId && !this.deleted.has(checkin.id))
      .filter((checkin) => !filters.month || checkin.checkedAt.slice(0, 7) === filters.month)
      .filter((checkin) => !filters.tag || checkin.tags.includes(filters.tag))
      .filter((checkin) => !rangeStart || new Date(checkin.checkedAt) >= rangeStart)
      .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  }

  async getCheckin(userId: string, id: string): Promise<Checkin | null> {
    return this.checkins.find((checkin) => checkin.userId === userId && checkin.id === id && !this.deleted.has(id)) ?? null;
  }

  async deleteCheckin(userId: string, id: string): Promise<boolean> {
    const exists = await this.getCheckin(userId, id);
    if (!exists) return false;
    this.deleted.add(id);
    return true;
  }

  async listTags(userId: string): Promise<TagRecord[]> {
    const usedTags = this.checkins
      .filter((checkin) => checkin.userId === userId)
      .flatMap((checkin) => checkin.tags);
    const names = [...new Set([...defaultTags, ...usedTags])];
    return names.map((name, index) => ({
      id: `tag-${index}`,
      name,
      slug: name,
      userId: defaultTags.includes(name) ? null : userId,
      sortOrder: index * 10
    }));
  }

  async getMapPoints(userId: string, range?: DateRange): Promise<MapPoint[]> {
    const checkins = await this.listCheckins(userId, { range });
    return checkins
      .filter((checkin) => checkin.locationMode !== "none" && checkin.lat != null && checkin.lng != null)
      .map((checkin) => ({
        id: checkin.id,
        status: checkin.status,
        latitude: checkin.lat as number,
        longitude: checkin.lng as number,
        title: checkin.placeName || "蹲点记录",
        locationMode: checkin.locationMode as "fuzzy" | "precise",
        checkedAt: checkin.checkedAt
      }));
  }

  async getStatsSummary(userId: string): Promise<StatsSummary> {
    const checkins = await this.listCheckins(userId, { range: "all" });
    const monthKey = new Date().toISOString().slice(0, 7);
    const days = new Set(checkins.map((checkin) => dateKey(checkin.checkedAt)));
    const places = new Map<string, number>();

    for (const checkin of checkins) {
      if (checkin.placeName) places.set(checkin.placeName, (places.get(checkin.placeName) ?? 0) + 1);
    }

    let streakDays = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (days.has(dateKey(cursor))) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return {
      totalCount: checkins.length,
      monthCount: checkins.filter((checkin) => checkin.checkedAt.slice(0, 7) === monthKey).length,
      streakDays,
      favoritePlace: [...places.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      lastCheckinAt: checkins[0]?.checkedAt ?? null
    };
  }
}
