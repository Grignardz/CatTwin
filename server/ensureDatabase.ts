import "./config";
import { mkdir, open } from "node:fs/promises";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith("file:")) {
  throw new Error("ensureDatabase expects a SQLite DATABASE_URL beginning with file:");
}

const configuredPath = databaseUrl.slice("file:".length);
const databasePath = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.resolve(process.cwd(), "prisma", configuredPath);

await mkdir(path.dirname(databasePath), { recursive: true });
const handle = await open(databasePath, "a");
await handle.close();
