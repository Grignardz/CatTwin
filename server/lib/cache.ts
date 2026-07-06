type Entry<T> = { value: T; expiresAt: number };

class TtlCache {
  private readonly entries = new Map<string, Entry<unknown>>();
  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) { this.entries.delete(key); return undefined; }
    return entry.value as T;
  }
  set<T>(key: string, value: T, ttlMs = 60_000) {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
  deletePrefix(prefix: string) {
    for (const key of this.entries.keys()) if (key.startsWith(prefix)) this.entries.delete(key);
  }
}

export const cache = new TtlCache();
