const SSLMODE_VALUES_REQUIRING_LIBPQ_COMPAT = new Set(["prefer", "require", "verify-ca"]);

export function withLibpqSslCompatibility(databaseUrl: string): string {
  if (/[?&]uselibpqcompat=/i.test(databaseUrl)) {
    return databaseUrl;
  }

  const sslModeMatch = databaseUrl.match(/[?&]sslmode=([^&#]+)/i);
  if (!sslModeMatch) {
    return databaseUrl;
  }

  const sslMode = decodeURIComponent(sslModeMatch[1]).toLowerCase();
  if (!SSLMODE_VALUES_REQUIRING_LIBPQ_COMPAT.has(sslMode)) {
    return databaseUrl;
  }

  const fragmentIndex = databaseUrl.indexOf("#");
  const baseUrl = fragmentIndex === -1 ? databaseUrl : databaseUrl.slice(0, fragmentIndex);
  const fragment = fragmentIndex === -1 ? "" : databaseUrl.slice(fragmentIndex);
  const separator = baseUrl.includes("?") ? "&" : "?";

  return `${baseUrl}${separator}uselibpqcompat=true${fragment}`;
}
