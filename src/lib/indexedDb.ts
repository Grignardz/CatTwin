/**
 * Minimal IndexedDB wrapper for storing photo-analysis scans on-device.
 *
 * Photos are kept as base64 data URLs (simplest for a small, phone-local
 * dataset) inside IndexedDB rather than localStorage, since localStorage
 * has a much smaller quota (~5-10MB total) and images add up quickly.
 */

export interface StoredPhotoScan {
  id: string;
  catId: string;
  userId: string;
  photoDataUrl: string; // full-size image, base64 data URL
  thumbnailDataUrl: string; // small preview, base64 data URL
  capturedAt: string; // ISO
  createdAt: string; // ISO
  status: "complete" | "failed";
  errorMessage: string | null;
  bcsScore: number | null;
  bcsConfidence: number | null;
  weightEstimateKg: number | null;
  weightConfidence: number | null;
  obesityRiskLevel: "Low" | "Medium" | "High" | null;
  coatConditionScore: number | null;
  coatConditionNotes: string | null;
  recommendations: string[];
  overallConfidence: number | null;
}

const DB_NAME = "cattwin";
const DB_VERSION = 1;
const STORE = "photoScans";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("catId", "catId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB."));
  });
}

export async function savePhotoScan(scan: StoredPhotoScan): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(scan);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to save scan."));
  });
  db.close();
}

export async function listPhotoScans(catId: string): Promise<StoredPhotoScan[]> {
  const db = await openDb();
  const results = await new Promise<StoredPhotoScan[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const index = tx.objectStore(STORE).index("catId");
    const req = index.getAll(catId);
    req.onsuccess = () => resolve(req.result as StoredPhotoScan[]);
    req.onerror = () => reject(req.error ?? new Error("Failed to load scans."));
  });
  db.close();
  return results.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

export async function deletePhotoScan(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete scan."));
  });
  db.close();
}
