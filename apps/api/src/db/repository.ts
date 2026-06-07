import type {
  Checkin,
  CheckinFilters,
  CreateCheckinInput,
  DateRange,
  MapPoint,
  StatsSummary,
  User
} from "../types/domain.js";

export interface TagRecord {
  id: string;
  name: string;
  slug: string;
  userId: string | null;
  sortOrder: number;
}

export interface AppRepository {
  upsertUserByOpenid(openid: string): Promise<User>;
  createCheckin(userId: string, input: CreateCheckinInput): Promise<Checkin>;
  listCheckins(userId: string, filters?: CheckinFilters): Promise<Checkin[]>;
  getCheckin(userId: string, id: string): Promise<Checkin | null>;
  deleteCheckin(userId: string, id: string): Promise<boolean>;
  listTags(userId: string): Promise<TagRecord[]>;
  getMapPoints(userId: string, range?: DateRange): Promise<MapPoint[]>;
  getStatsSummary(userId: string): Promise<StatsSummary>;
  close?(): Promise<void>;
}
