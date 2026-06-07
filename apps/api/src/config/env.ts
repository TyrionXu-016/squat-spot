import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("127.0.0.1"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@127.0.0.1:54322/postgres"),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(5),
  JWT_SECRET: z.string().min(12).default("dev-only-change-me"),
  JWT_EXPIRES_IN: z.string().default("30d"),
  WECHAT_MOCK_LOGIN: z
    .union([z.string(), z.boolean()])
    .transform((value) => value === true || value === "true"),
  WECHAT_APP_ID: z.string().optional(),
  WECHAT_APP_SECRET: z.string().optional(),
  CORS_ORIGIN: z.string().default("*")
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const input: Record<string, unknown> = {
    ...process.env,
    ...overrides
  };

  input.WECHAT_MOCK_LOGIN ??= input.NODE_ENV === "production" ? "false" : "true";

  return envSchema.parse(input);
}
