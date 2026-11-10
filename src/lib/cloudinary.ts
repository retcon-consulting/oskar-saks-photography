import "server-only";
import { randomBytes } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import {
  MEDIA_FORMATS,
  MEDIA_UPLOAD_TAG,
  SITE_UPLOAD_TAG,
  mediaFolder,
  siteFolder,
  type SiteImageKey,
} from "@/lib/media";

function readConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

function configured() {
  const config = readConfig();
  if (!config) return null;
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
  return config;
}

export function isMediaConfigured() {
  return readConfig() !== null;
}

export function mediaUrl(publicId: string) {
  return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME ?? ""}/image/upload/${publicId}`;
}

// Signed parameters the browser posts straight to Cloudinary, so image bytes never pass through the server.
export function signMediaUpload(category: string) {
  const config = configured();
  if (!config) return null;

  const folder = mediaFolder(category);
  const params = {
    asset_folder: folder,
    allowed_formats: MEDIA_FORMATS.join(","),
    overwrite: "false",
    public_id: `${folder}/${randomBytes(9).toString("hex")}`,
    tags: MEDIA_UPLOAD_TAG,
    timestamp: Math.floor(Date.now() / 1000),
  };
  const signature = cloudinary.utils.api_sign_request(params, config.apiSecret);
  return { cloudName: config.cloudName, apiKey: config.apiKey, signature, params };
}

export function signSiteUpload(key: SiteImageKey) {
  const config = configured();
  if (!config) return null;

  const folder = siteFolder(key);
  const params = {
    asset_folder: folder,
    allowed_formats: MEDIA_FORMATS.join(","),
    overwrite: "false",
    public_id: `${folder}/${randomBytes(9).toString("hex")}`,
    tags: SITE_UPLOAD_TAG,
    timestamp: Math.floor(Date.now() / 1000),
  };
  const signature = cloudinary.utils.api_sign_request(params, config.apiSecret);
  return { cloudName: config.cloudName, apiKey: config.apiKey, signature, params };
}

export type UploadedImage ={ width: number; height: number; bytes: number; format: string };

export async function fetchUploadedImage(publicId: string): Promise<UploadedImage | null> {
  if (!configured()) return null;
  try {
    const resource = await cloudinary.api.resource(publicId, { resource_type: "image" });
    return { width: resource.width, height: resource.height, bytes: resource.bytes, format: resource.format };
  } catch {
    return null;
  }
}

export async function markImagesAttached(publicIds: string[], tag: string = MEDIA_UPLOAD_TAG) {
  if (publicIds.length === 0 || !configured()) return;
  await cloudinary.uploader.remove_tag(tag, publicIds);
}

export async function destroyImages(publicIds: string[]) {
  if (publicIds.length === 0 || !configured()) return;
  await cloudinary.api.delete_resources(publicIds, { resource_type: "image", type: "upload", invalidate: true });
}

// Cloudinary deletes at most 100 files per call. Returns the ids that could not be removed, so callers can say so.
const DELETE_BATCH_SIZE = 100;

export async function destroyImagesInBatches(publicIds: string[]): Promise<string[]> {
  if (publicIds.length === 0) return [];
  if (!configured()) return publicIds;

  const failed: string[] = [];
  for (let start = 0; start < publicIds.length; start += DELETE_BATCH_SIZE) {
    const batch = publicIds.slice(start, start + DELETE_BATCH_SIZE);
    try {
      const result = await cloudinary.api.delete_resources(batch, { resource_type: "image", type: "upload", invalidate: true });
      for (const id of batch) {
        const status = result.deleted?.[id];
        if (status !== "deleted" && status !== "not_found") failed.push(id);
      }
    } catch {
      failed.push(...batch);
    }
  }
  return failed;
}
