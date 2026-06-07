import type { CreateCheckinInput, LocationMode } from "../types/domain.js";

export interface NormalizedLocation {
  locationMode: LocationMode;
  lat: number | null;
  lng: number | null;
  placeName: string | null;
}

function roundCoordinate(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function normalizeLocation(input: CreateCheckinInput): NormalizedLocation {
  if (input.locationMode === "none") {
    return {
      locationMode: "none",
      lat: null,
      lng: null,
      placeName: input.placeName?.trim() || null
    };
  }

  if (typeof input.lat !== "number" || typeof input.lng !== "number") {
    throw new Error("lat and lng are required when locationMode is fuzzy or precise");
  }

  if (input.lat < -90 || input.lat > 90 || input.lng < -180 || input.lng > 180) {
    throw new Error("lat or lng is out of bounds");
  }

  const decimals = input.locationMode === "fuzzy" ? 2 : 6;

  return {
    locationMode: input.locationMode,
    lat: roundCoordinate(input.lat, decimals),
    lng: roundCoordinate(input.lng, decimals),
    placeName: input.placeName?.trim() || null
  };
}
