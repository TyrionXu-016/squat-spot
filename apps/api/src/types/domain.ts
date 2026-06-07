export type CheckinStatus = "smooth" | "normal" | "hard";
export type LocationMode = "none" | "fuzzy" | "precise";
export type DateRange = "today" | "week" | "month" | "all";

export interface User {
  id: string;
  openid: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  lastLoginAt: string;
}

export interface Checkin {
  id: string;
  userId: string;
  status: CheckinStatus;
  tags: string[];
  note?: string | null;
  locationMode: LocationMode;
  placeName?: string | null;
  lat?: number | null;
  lng?: number | null;
  checkedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckinInput {
  status: CheckinStatus;
  tags: string[];
  note?: string | null;
  locationMode: LocationMode;
  lat?: number;
  lng?: number;
  placeName?: string | null;
  checkedAt?: string;
}

export interface CheckinFilters {
  month?: string;
  tag?: string;
  range?: DateRange;
}

export interface MapPoint {
  id: string;
  status: CheckinStatus;
  latitude: number;
  longitude: number;
  title: string;
  locationMode: Exclude<LocationMode, "none">;
  checkedAt: string;
}

export interface StatsSummary {
  totalCount: number;
  monthCount: number;
  streakDays: number;
  favoritePlace: string | null;
  lastCheckinAt: string | null;
}
