import { loadEnvFile } from "node:process";

try { loadEnvFile(); } catch { /* .env is optional in tests/deployments. */ }

export const config = {
  port: Number(process.env.PORT ?? 3001),
  appOrigin: process.env.APP_ORIGIN ?? "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me-before-deploying",
  jwtDays: 14,
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  maxImageBytes: 10 * 1024 * 1024,
  scanRateLimit: 5,
  scanRateWindowMs: 60 * 60 * 1000,
} as const;

if (process.env.NODE_ENV === "production" && config.jwtSecret.startsWith("dev-only")) {
  throw new Error("JWT_SECRET must be configured in production");
}
