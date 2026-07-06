import { EventEmitter } from "node:events";
import type { PhotoScanCompletedEvent } from "../types";

type HealthDataChangedEvent = { catId: string; userId: string };
class CatTwinEvents extends EventEmitter {
  emitPhotoScanCompleted(payload: PhotoScanCompletedEvent) { this.emit("photoScanCompleted", payload); }
  emitHealthDataChanged(payload: HealthDataChangedEvent) { this.emit("healthDataChanged", payload); }
  onPhotoScanCompleted(listener: (payload: PhotoScanCompletedEvent) => void | Promise<void>) { this.on("photoScanCompleted", listener); }
  onHealthDataChanged(listener: (payload: HealthDataChangedEvent) => void | Promise<void>) { this.on("healthDataChanged", listener); }
}
export const events = new CatTwinEvents();
