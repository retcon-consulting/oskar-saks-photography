"use server";

import { randomBytes } from "node:crypto";
import { updateTag } from "next/cache";
import { z } from "zod";
import { verifyAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { UNASSIGNED_SLUG } from "@/lib/gallery";
import {
  destroyImages,
  destroyImagesInBatches,
  fetchUploadedImage,
  markImagesAttached,
  mediaUrl,
  signMediaUpload,
} from "@/lib/cloudinary";
import { MAX_MEDIA_BYTES, MEDIA_FORMATS, MEDIA_PUBLIC_ID_PATTERN, mediaFolder } from "@/lib/media";

export type ActionResult = { ok: true } | { ok: false; error: string };

const slugSchema = z.string().trim().min(1).max(80);

// A gallery that exists. Uploads and copy edits only apply to public galleries, never the hidden "Unassigned photos" one.
async function findGallery(slug: string, { allowHidden = false } = {}) {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return null;
  const row = await db.category.findUnique({ where: { slug: parsed.data } });
  return row && (allowHidden || !row.hidden) ? row : null;
}

const photoFields = {
  alt: z.string().trim().min(1, "Alt text is required").max(300),
  title: z.string().trim().max(120),
};

export async function signUploadAction(category: string) {
  await verifyAdmin();
  const gallery = await findGallery(category);
  if (!gallery) return null;
  return signMediaUpload(gallery.slug);
}

export async function addPhotoAction(input: { category: string; publicId: string; alt: string }): Promise<ActionResult> {
  await verifyAdmin();
  const gallery = await findGallery(input.category);
  const alt = photoFields.alt.safeParse(input.alt);
  if (!gallery || !alt.success) return { ok: false, error: "Invalid photo details" };

  const { publicId } = input;
  if (!MEDIA_PUBLIC_ID_PATTERN.test(publicId) || !publicId.startsWith(`${mediaFolder(gallery.slug)}/`)) {
    return { ok: false, error: "Invalid upload" };
  }

  const image = await fetchUploadedImage(publicId);
  if (!image || !MEDIA_FORMATS.includes(image.format)) return { ok: false, error: "Upload could not be verified" };
  if (image.bytes > MAX_MEDIA_BYTES) {
    await destroyImages([publicId]).catch(() => undefined);
    return { ok: false, error: "Photos must be 10 MB or smaller" };
  }

  const last = await db.photo.aggregate({ where: { category: gallery.slug }, _max: { position: true }, _count: true });
  await db.photo.create({
    data: {
      id: `p${randomBytes(6).toString("hex")}`,
      cloudinaryPublicId: publicId,
      url: mediaUrl(publicId),
      width: image.width,
      height: image.height,
      alt: alt.data,
      category: gallery.slug,
      cover: last._count === 0,
      position: (last._max.position ?? -1) + 1,
    },
  });
  await markImagesAttached([publicId]).catch((error) => console.error("Failed to tag upload:", error));
  // This also refreshes the listed galleries: a gallery appears on the public site once it has its first photo.
  updateTag("photos");
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().min(1),
  ...photoFields,
  cover: z.boolean(),
});

export async function updatePhotoAction(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  await verifyAdmin();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid photo details" };

  const { id, cover, title, ...rest } = parsed.data;
  const photo = await db.photo.findUnique({ where: { id } });
  if (!photo) return { ok: false, error: "Photo not found" };

  await db.$transaction([
    ...(cover
      ? [db.photo.updateMany({ where: { category: photo.category, id: { not: id } }, data: { cover: false } })]
      : []),
    db.photo.update({ where: { id }, data: { ...rest, title: title || null, cover } }),
  ]);
  updateTag("photos");
  return { ok: true };
}

export async function deletePhotoAction(id: string): Promise<ActionResult> {
  await verifyAdmin();
  const photo = await db.photo.findUnique({ where: { id } });
  if (!photo) return { ok: false, error: "Photo not found" };

  await db.photo.delete({ where: { id } });
  if (photo.cover) {
    const next = await db.photo.findFirst({ where: { category: photo.category }, orderBy: { position: "asc" } });
    if (next) await db.photo.update({ where: { id: next.id }, data: { cover: true } });
  }
  await destroyImages([photo.cloudinaryPublicId]).catch((error) => console.error("Failed to delete image:", error));
  updateTag("photos");
  return { ok: true };
}

export type BulkDeleteResult = { ok: true; deleted: number; failedFiles: number } | { ok: false; error: string };

const bulkIdsSchema = z.array(z.string().min(1)).min(1).max(500);

export async function deletePhotosAction(ids: string[]): Promise<BulkDeleteResult> {
  await verifyAdmin();
  const parsed = bulkIdsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Select between 1 and 500 photos" };

  const photos = await db.photo.findMany({ where: { id: { in: [...new Set(parsed.data)] } } });
  if (photos.length === 0) return { ok: false, error: "Those photos no longer exist" };

  // Rows first: if removing the files then fails, the worst case is an unused file in Cloudinary, not a broken image on the site.
  await db.photo.deleteMany({ where: { id: { in: photos.map((photo) => photo.id) } } });

  // A gallery that lost its cover gets the first remaining photo as its new one.
  for (const category of new Set(photos.filter((photo) => photo.cover).map((photo) => photo.category))) {
    if ((await db.photo.count({ where: { category, cover: true } })) > 0) continue;
    const next = await db.photo.findFirst({ where: { category }, orderBy: { position: "asc" } });
    if (next) await db.photo.update({ where: { id: next.id }, data: { cover: true } });
  }

  const failed = await destroyImagesInBatches(photos.map((photo) => photo.cloudinaryPublicId));
  if (failed.length > 0) console.error("Failed to delete from Cloudinary:", failed);

  updateTag("photos");
  return { ok: true, deleted: photos.length, failedFiles: failed.length };
}

const labelSchema = z.string().trim().min(1, "Give the gallery a name").max(40, "Keep the name to 40 characters");

const copySchema = z.object({
  slug: slugSchema,
  label: labelSchema,
  heading: z.string().trim().min(1).max(120),
  tagline: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1200),
});

export async function updateCategoryAction(input: z.input<typeof copySchema>): Promise<ActionResult> {
  await verifyAdmin();
  const parsed = copySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Name, heading, tagline and description are all required" };
  const { slug, ...copy } = parsed.data;
  if (!(await findGallery(slug))) return { ok: false, error: "That gallery no longer exists. Refresh and try again." };
  await db.category.update({ where: { slug }, data: copy });
  updateTag("categories");
  return { ok: true };
}

// "Wedding & Elopements" -> "wedding-elopements". The slug is the gallery's URL and Cloudinary folder, so it is made once and kept.
function slugify(label: string) {
  const slug = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return slug || "gallery";
}

export type CreateGalleryResult = { ok: true; slug: string } | { ok: false; error: string };

export async function createCategoryAction(input: { label: string }): Promise<CreateGalleryResult> {
  await verifyAdmin();
  const label = labelSchema.safeParse(input.label);
  if (!label.success) return { ok: false, error: label.error.issues[0]?.message ?? "Give the gallery a name" };

  const base = slugify(label.data);
  let slug = base;
  for (let suffix = 2; slug === UNASSIGNED_SLUG || (await db.category.findUnique({ where: { slug }, select: { slug: true } })); suffix++) {
    slug = `${base}-${suffix}`;
  }

  const last = await db.category.aggregate({ where: { hidden: false }, _max: { position: true } });
  await db.category.create({
    data: {
      slug,
      label: label.data,
      heading: label.data,
      tagline: "Add a short tagline",
      description: "Add a description of this gallery.",
      position: (last._max.position ?? -1) + 1,
    },
  });
  updateTag("categories");
  return { ok: true, slug };
}

export type DeleteGalleryResult = { ok: true; moved: number } | { ok: false; error: string };

// Photos are never lost with a gallery: they move to the hidden "Unassigned photos" gallery, where they can be reassigned or deleted.
export async function deleteCategoryAction(slug: string): Promise<DeleteGalleryResult> {
  await verifyAdmin();
  const gallery = await findGallery(slug);
  if (!gallery) return { ok: false, error: "That gallery no longer exists" };
  if ((await db.category.count({ where: { hidden: false } })) <= 1) {
    return { ok: false, error: "There must always be at least one gallery" };
  }

  const photos = await db.photo.findMany({
    where: { category: gallery.slug },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const last = await db.photo.aggregate({ where: { category: UNASSIGNED_SLUG }, _max: { position: true } });
  const start = (last._max.position ?? -1) + 1;

  await db.$transaction([
    ...photos.map((photo, index) =>
      db.photo.update({ where: { id: photo.id }, data: { category: UNASSIGNED_SLUG, cover: false, position: start + index } }),
    ),
    db.category.delete({ where: { slug: gallery.slug } }),
  ]);
  updateTag("categories");
  updateTag("photos");
  return { ok: true, moved: photos.length };
}

export type MovePhotosResult = { ok: true; moved: number } | { ok: false; error: string };

export async function movePhotosAction(input: { ids: string[]; to: string }): Promise<MovePhotosResult> {
  await verifyAdmin();
  const ids = bulkIdsSchema.safeParse(input.ids);
  if (!ids.success) return { ok: false, error: "Select between 1 and 500 photos" };
  // "Unassigned photos" is a valid destination too: it's how photos are set aside without being deleted.
  const target = await findGallery(input.to, { allowHidden: true });
  if (!target) return { ok: false, error: "Choose a gallery to move them to" };

  const photos = await db.photo.findMany({
    where: { id: { in: [...new Set(ids.data)] }, category: { not: target.slug } },
    orderBy: [{ category: "asc" }, { position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
  if (photos.length === 0) return { ok: false, error: "Those photos are already in that gallery" };

  const last = await db.photo.aggregate({ where: { category: target.slug }, _max: { position: true } });
  const start = (last._max.position ?? -1) + 1;

  // A cover belongs to its gallery, so a moved photo arrives as a normal photo.
  await db.$transaction(
    photos.map((photo, index) =>
      db.photo.update({ where: { id: photo.id }, data: { category: target.slug, cover: false, position: start + index } }),
    ),
  );

  // Every gallery keeps exactly one cover: the target gets one if it had none, and a gallery that lost its cover picks a new one.
  const affected = new Set([target.slug, ...photos.filter((photo) => photo.cover).map((photo) => photo.category)]);
  for (const category of affected) {
    if (category === UNASSIGNED_SLUG) continue;
    if ((await db.photo.count({ where: { category, cover: true } })) > 0) continue;
    const next = await db.photo.findFirst({ where: { category }, orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }] });
    if (next) await db.photo.update({ where: { id: next.id }, data: { cover: true } });
  }

  updateTag("photos");
  return { ok: true, moved: photos.length };
}

export async function reorderPhotosAction(input: { category: string; ids: string[] }): Promise<ActionResult> {
  await verifyAdmin();
  const gallery = await findGallery(input.category, { allowHidden: true });
  if (!gallery || !Array.isArray(input.ids)) return { ok: false, error: "Invalid order" };

  const existing = await db.photo.findMany({ where: { category: gallery.slug }, select: { id: true } });
  const known = new Set(existing.map((photo) => photo.id));
  const unique = new Set(input.ids);
  if (unique.size !== input.ids.length || unique.size !== known.size || input.ids.some((id) => !known.has(id))) {
    return { ok: false, error: "The gallery changed. Refresh and try again." };
  }

  await db.$transaction(
    input.ids.map((id, position) => db.photo.update({ where: { id }, data: { position } })),
  );
  updateTag("photos");
  return { ok: true };
}
