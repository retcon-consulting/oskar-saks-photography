import { cacheLife, cacheTag } from "next/cache";
import type { Photo } from "@/data/photos";
import { db } from "@/lib/db";

// The admin-only holding gallery for photos whose gallery was deleted. It never appears on the public site.
export const UNASSIGNED_SLUG = "unassigned";

export type Gallery = { slug: string; label: string; heading: string; tagline: string; description: string };

type PhotoRow = Awaited<ReturnType<typeof db.photo.findMany>>[number];

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    src: row.url,
    width: row.width,
    height: row.height,
    alt: row.alt,
    category: row.category,
    title: row.title ?? undefined,
    cover: row.cover,
  };
}

export async function getPhotosByCategory(slug: string): Promise<Photo[]> {
  "use cache";
  cacheTag("photos");
  cacheLife("days");
  const rows = await db.photo.findMany({ where: { category: slug }, orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }] });
  return rows.map(toPhoto);
}

// Every public gallery in display order, empty ones included (the page for an empty gallery still exists; it is just not linked).
export async function getCategories(): Promise<Gallery[]> {
  "use cache";
  cacheTag("categories");
  cacheLife("days");
  return db.category.findMany({
    where: { hidden: false },
    orderBy: [{ position: "asc" }, { slug: "asc" }],
    select: { slug: true, label: true, heading: true, tagline: true, description: true },
  });
}

// The galleries visitors are pointed to (nav, home cards, sitemap, "also see"): a gallery shows up once it has a photo.
export async function getListedCategories(): Promise<Gallery[]> {
  "use cache";
  cacheTag("categories", "photos");
  cacheLife("days");
  const [categories, counts] = await Promise.all([
    getCategories(),
    db.photo.groupBy({ by: ["category"], _count: { _all: true } }),
  ]);
  const filled = new Set(counts.map((row) => row.category));
  return categories.filter((category) => filled.has(category.slug));
}

// Copy is editable in the admin. Unknown and hidden slugs return undefined, so their page is a 404.
export async function getCategoryContent(slug: string): Promise<Gallery | undefined> {
  "use cache";
  cacheTag("categories");
  cacheLife("days");
  const row = await db.category.findUnique({ where: { slug } });
  if (!row || row.hidden) return undefined;
  return { slug: row.slug, label: row.label, heading: row.heading, tagline: row.tagline, description: row.description };
}
