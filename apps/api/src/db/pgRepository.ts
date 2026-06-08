import pg from "pg";
import type {
  Checkin,
  CheckinFilters,
  CreateCheckinInput,
  DateRange,
  MapPoint,
  StatsSummary,
  User
} from "../types/domain.js";
import { dateKey, nextMonth, startOfMonth, startOfRange } from "../utils/dates.js";
import { normalizeLocation } from "../utils/location.js";
import { withLibpqSslCompatibility } from "./connection.js";
import type { AppRepository, TagRecord } from "./repository.js";

const { Pool } = pg;

type DbCheckinRow = {
  id: string;
  user_id: string;
  status: Checkin["status"];
  tags: string[] | null;
  note: string | null;
  location_mode: Checkin["locationMode"];
  place_name: string | null;
  lat: number | null;
  lng: number | null;
  checked_at: Date;
  created_at: Date;
  updated_at: Date;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function slugifyTag(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function mapUser(row: {
  id: string;
  openid: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: Date;
  last_login_at: Date;
}): User {
  return {
    id: row.id,
    openid: row.openid,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at.toISOString(),
    lastLoginAt: row.last_login_at.toISOString()
  };
}

function mapCheckin(row: DbCheckinRow): Checkin {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    tags: row.tags ?? [],
    note: row.note,
    locationMode: row.location_mode,
    placeName: row.place_name,
    lat: row.lat,
    lng: row.lng,
    checkedAt: toIso(row.checked_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export class PgRepository implements AppRepository {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string, maxConnections = 5) {
    this.pool = new Pool({
      connectionString: withLibpqSslCompatibility(databaseUrl),
      max: maxConnections
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async upsertUserByOpenid(openid: string): Promise<User> {
    const result = await this.pool.query(
      `
        insert into public.users (openid, last_login_at)
        values ($1, now())
        on conflict (openid)
        do update set last_login_at = excluded.last_login_at
        returning id, openid, nickname, avatar_url, created_at, last_login_at
      `,
      [openid]
    );
    return mapUser(result.rows[0]);
  }

  async createCheckin(userId: string, input: CreateCheckinInput): Promise<Checkin> {
    const location = normalizeLocation(input);
    const checkedAt = input.checkedAt ? new Date(input.checkedAt) : new Date();
    const client = await this.pool.connect();

    try {
      await client.query("begin");

      const insertResult = await client.query<DbCheckinRow>(
        `
          insert into public.checkins (
            user_id, status, note, location_mode, place_name, lat, lng, geom, checked_at
          )
          values (
            $1, $2, $3, $4, $5, $6, $7,
            case
              when $6::double precision is null or $7::double precision is null then null
              else ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography
            end,
            $8
          )
          returning id, user_id, status, '{}'::text[] as tags, note, location_mode,
            place_name, lat, lng, checked_at, created_at, updated_at
        `,
        [
          userId,
          input.status,
          input.note?.trim() || null,
          location.locationMode,
          location.placeName,
          location.lat,
          location.lng,
          checkedAt
        ]
      );

      const checkinId = insertResult.rows[0].id;
      const tagNames = [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))];

      for (const tagName of tagNames) {
        const tag = await this.findOrCreateTag(client, userId, tagName);
        await client.query(
          `
            insert into public.checkin_tags (checkin_id, tag_id)
            values ($1, $2)
            on conflict do nothing
          `,
          [checkinId, tag.id]
        );
      }

      await client.query("commit");
      const created = await this.getCheckin(userId, checkinId);
      if (!created) throw new Error("created checkin was not found");
      return created;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async listCheckins(userId: string, filters: CheckinFilters = {}): Promise<Checkin[]> {
    const { sql, values } = this.buildCheckinsQuery(userId, filters, false);
    const result = await this.pool.query<DbCheckinRow>(sql, values);
    return result.rows.map(mapCheckin);
  }

  async getCheckin(userId: string, id: string): Promise<Checkin | null> {
    const result = await this.pool.query<DbCheckinRow>(
      `
        select c.id, c.user_id, c.status,
          coalesce(array_agg(t.name order by t.sort_order, t.name) filter (where t.id is not null), '{}') as tags,
          c.note, c.location_mode, c.place_name, c.lat, c.lng,
          c.checked_at, c.created_at, c.updated_at
        from public.checkins c
        left join public.checkin_tags ct on ct.checkin_id = c.id
        left join public.tags t on t.id = ct.tag_id
        where c.user_id = $1 and c.id = $2 and c.deleted_at is null
        group by c.id
      `,
      [userId, id]
    );
    return result.rows[0] ? mapCheckin(result.rows[0]) : null;
  }

  async deleteCheckin(userId: string, id: string): Promise<boolean> {
    const result = await this.pool.query(
      `
        update public.checkins
        set deleted_at = now()
        where user_id = $1 and id = $2 and deleted_at is null
      `,
      [userId, id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listTags(userId: string): Promise<TagRecord[]> {
    const result = await this.pool.query<{
      id: string;
      name: string;
      slug: string;
      user_id: string | null;
      sort_order: number;
    }>(
      `
        select id, name, slug, user_id, sort_order
        from public.tags
        where user_id is null or user_id = $1
        order by user_id nulls first, sort_order, name
      `,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      userId: row.user_id,
      sortOrder: row.sort_order
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
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const byPlace = new Map<string, number>();

    for (const checkin of checkins) {
      if (checkin.placeName) {
        byPlace.set(checkin.placeName, (byPlace.get(checkin.placeName) ?? 0) + 1);
      }
    }

    const days = new Set(checkins.map((checkin) => dateKey(checkin.checkedAt)));
    let streakDays = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (days.has(dateKey(cursor))) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const favoritePlace = [...byPlace.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      totalCount: checkins.length,
      monthCount: checkins.filter((checkin) => checkin.checkedAt.slice(0, 7) === monthKey).length,
      streakDays,
      favoritePlace,
      lastCheckinAt: checkins[0]?.checkedAt ?? null
    };
  }

  private buildCheckinsQuery(
    userId: string,
    filters: CheckinFilters,
    single: boolean
  ): { sql: string; values: unknown[] } {
    const values: unknown[] = [userId];
    const where = ["c.user_id = $1", "c.deleted_at is null"];

    if (filters.month) {
      values.push(startOfMonth(filters.month), nextMonth(filters.month));
      where.push(`c.checked_at >= $${values.length - 1} and c.checked_at < $${values.length}`);
    }

    const rangeStart = startOfRange(filters.range);
    if (rangeStart) {
      values.push(rangeStart);
      where.push(`c.checked_at >= $${values.length}`);
    }

    if (filters.tag) {
      values.push(filters.tag);
      where.push(`
        exists (
          select 1
          from public.checkin_tags fct
          join public.tags ft on ft.id = fct.tag_id
          where fct.checkin_id = c.id and ft.name = $${values.length}
        )
      `);
    }

    return {
      values,
      sql: `
        select c.id, c.user_id, c.status,
          coalesce(array_agg(t.name order by t.sort_order, t.name) filter (where t.id is not null), '{}') as tags,
          c.note, c.location_mode, c.place_name, c.lat, c.lng,
          c.checked_at, c.created_at, c.updated_at
        from public.checkins c
        left join public.checkin_tags ct on ct.checkin_id = c.id
        left join public.tags t on t.id = ct.tag_id
        where ${where.join(" and ")}
        group by c.id
        order by c.checked_at desc
        ${single ? "limit 1" : ""}
      `
    };
  }

  private async findOrCreateTag(client: pg.PoolClient, userId: string, name: string): Promise<{ id: string }> {
    const slug = slugifyTag(name);
    const existing = await client.query<{ id: string }>(
      `
        select id
        from public.tags
        where (user_id is null or user_id = $1) and (slug = $2 or name = $3)
        order by user_id nulls first
        limit 1
      `,
      [userId, slug, name]
    );

    if (existing.rows[0]) return existing.rows[0];

    const created = await client.query<{ id: string }>(
      `
        insert into public.tags (user_id, name, slug, sort_order)
        values ($1, $2, $3, 100)
        returning id
      `,
      [userId, name, slug]
    );
    return created.rows[0];
  }
}
