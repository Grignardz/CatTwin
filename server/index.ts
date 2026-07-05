import "./config";
import http from "node:http";
import express from "express";
import cookieParser from "cookie-parser";
import { config } from "./config";
import { prisma } from "./db";
import { uploadDirectory } from "./services/imageStorage";
import { photoScansRouter } from "./routes/photoScans";
import { errorHandler } from "./middleware/errors";

export const app = express();

app.disable("x-powered-by");
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === config.appOrigin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadDirectory, { fallthrough: false, maxAge: "1h" }));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Health check failed", error);
    res.status(503).json({ status: "degraded", database: "unavailable", timestamp: new Date().toISOString() });
  }
});

app.use("/api/photo-scans", photoScansRouter);
app.use(errorHandler);

const server = http.createServer(app);
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down gracefully.`);
  const forceExit = setTimeout(() => { console.error("Graceful shutdown timed out."); process.exit(1); }, 10_000);
  forceExit.unref();
  server.close(async (error) => {
    await prisma.$disconnect();
    if (error) { console.error(error); process.exitCode = 1; }
    clearTimeout(forceExit);
    process.exit();
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

if (process.env.NODE_ENV !== "test") {
  server.listen(config.port, () => console.log(`CatTwin API listening on http://localhost:${config.port}`));
}

export { server, shutdown };
