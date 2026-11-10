"use server";

import { updateTag } from "next/cache";
import { verifyAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { CONTENT, aboutSchema, type ContentKey } from "@/lib/contentSchema";
import type { ActionResult } from "./actions";

async function saveContent(key: ContentKey, input: unknown): Promise<ActionResult> {
  await verifyAdmin();
  const parsed = CONTENT[key].schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.findLast((part) => typeof part === "string");
    return { ok: false, error: issue ? `${field ? `${field}: ` : ""}${issue.message}` : "Please check the form and try again." };
  }
  await db.siteContent.upsert({ where: { key }, create: { key, data: parsed.data }, update: { data: parsed.data } });
  updateTag("content");
  return { ok: true };
}

export async function updateHomeContentAction(input: unknown) {
  return saveContent("home", input);
}

export async function updateAboutContentAction(input: unknown) {
  return saveContent("about", input);
}

// The About editor saves each section on its own: only that section's fields change, the rest of the saved copy stays as it is.
const ABOUT_SECTIONS = {
  intro: aboutSchema.pick({ pageTitle: true, intro: true }),
  vision: aboutSchema.pick({ sectionTitle: true, caption: true, paragraphs: true }),
} as const;

export async function updateAboutSectionAction(section: keyof typeof ABOUT_SECTIONS, input: unknown): Promise<ActionResult> {
  await verifyAdmin();
  const schema = ABOUT_SECTIONS[section];
  if (!schema) return { ok: false, error: "Unknown section" };
  const fields = schema.safeParse(input);
  if (!fields.success) {
    const issue = fields.error.issues[0];
    const field = issue?.path.findLast((part) => typeof part === "string");
    return { ok: false, error: issue ? `${field ? `${field}: ` : ""}${issue.message}` : "Please check the form and try again." };
  }
  const row = await db.siteContent.findUnique({ where: { key: "about" } });
  const current = row && aboutSchema.safeParse(row.data);
  return saveContent("about", { ...(current && current.success ? current.data : CONTENT.about.defaults), ...fields.data });
}

export async function updateContactContentAction(input: unknown) {
  return saveContent("contact", input);
}

// Services are saved as a whole list: order, additions and removals all arrive together.
export async function updateServicesContentAction(input: unknown) {
  return saveContent("services", input);
}
