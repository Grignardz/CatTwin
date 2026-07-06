import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

export interface StoredImage { photoUrl: string; thumbnailUrl: string; absolutePhotoPath: string }
export interface ImageStorageService {
  save(buffer: Buffer): Promise<StoredImage>;
  delete(photoUrl: string, thumbnailUrl: string): Promise<void>;
}

const uploadsDir = path.resolve(process.cwd(), "server", "uploads");

export class LocalImageStorageService implements ImageStorageService {
  async save(buffer: Buffer): Promise<StoredImage> {
    await mkdir(uploadsDir, { recursive: true });
    const id = randomUUID();
    const photoName = `${id}.webp`;
    const thumbName = `${id}-thumb.webp`;
    const photoPath = path.join(uploadsDir, photoName);
    const thumbPath = path.join(uploadsDir, thumbName);
    const normalized = await sharp(buffer).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const thumbnail = await sharp(normalized).resize({ width: 360, height: 360, fit: "cover" }).webp({ quality: 72 }).toBuffer();
    await Promise.all([writeFile(photoPath, normalized), writeFile(thumbPath, thumbnail)]);
    return { photoUrl: `/uploads/${photoName}`, thumbnailUrl: `/uploads/${thumbName}`, absolutePhotoPath: photoPath };
  }

  async delete(photoUrl: string, thumbnailUrl: string) {
    const names = [photoUrl, thumbnailUrl].map((url) => path.basename(url));
    await Promise.all(names.map((name) => unlink(path.join(uploadsDir, name)).catch(() => undefined)));
  }
}

export const imageStorage = new LocalImageStorageService();
export const uploadDirectory = uploadsDir;
