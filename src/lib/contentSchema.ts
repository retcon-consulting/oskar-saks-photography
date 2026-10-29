import { z } from "zod";
import { ABOUT_PARAGRAPHS, OSKAR_INTRO } from "@/data/about";
import { SERVICES } from "@/data/services";
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, LOCATION, SITE_TAGLINE } from "@/lib/siteConfig";

// Titles are plain text with two bits of markup: *word* is emphasised (italic accent) and a line break stays a line break.
const title = (max: number) => z.string().trim().min(1, "Required").max(max);

export const homeSchema = z.object({
  heroEyebrow: z.string().trim().min(1).max(80),
  heroTitle: title(120),
  heroTagline: z.string().trim().min(1).max(240),
  galleryEyebrow: z.string().trim().min(1).max(80),
  galleryTitle: title(80),
});

export const aboutSchema = z.object({
  sectionTitle: title(120),
  caption: z.string().trim().min(1).max(80),
  paragraphs: z.array(z.string().trim().min(1).max(1200)).min(1).max(6),
  pageTitle: title(120),
  intro: z.string().trim().min(1).max(2400),
});

// The discount fields default so services saved before they existed still parse.
export const serviceSchema = z
  .object({
    id: z.string().min(1).max(40),
    title: z.string().trim().min(1, "Every service needs a title").max(80),
    description: z.string().trim().min(1, "Every service needs a description").max(600),
    startingAt: z.number().int("Prices are whole dollars").min(0).max(1_000_000),
    includes: z.array(z.string().trim().min(1).max(120)).max(10),
    discountActive: z.boolean().default(false),
    discountName: z.string().trim().max(100).default(""),
    discountPercent: z
      .number("Discount % must be a number")
      .min(0, "Discount % can't be below 0")
      .max(100, "Discount % can't be above 100")
      .default(0),
  })
  .refine((service) => !service.discountActive || service.discountName.length > 0, {
    message: "Name the active discount",
    path: ["discountName"],
  });

export const servicesSchema = z.object({
  title: title(80),
  lede: z.string().trim().min(1).max(400),
  items: z.array(serviceSchema).min(1, "Keep at least one service").max(12),
});

// Accepts "oskarsaksphoto", "@oskarsaksphoto" or a pasted profile link, and keeps just the username.
const instagramUsername = z
  .string()
  .trim()
  .transform((value) => value.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, ""))
  .pipe(z.string().regex(/^[A-Za-z0-9._]{1,30}$/, "Enter the username only, like oskarsaksphoto"));

export const contactSchema = z.object({
  eyebrow: z.string().trim().min(1).max(80),
  title: title(80),
  lede: z.string().trim().min(1).max(400),
  email: z.string().trim().pipe(z.email("Enter a valid email address").max(200)),
  instagram: instagramUsername,
  location: z.string().trim().min(1).max(80),
});

export type HomeContent = z.infer<typeof homeSchema>;
export type ContactContent = z.infer<typeof contactSchema>;
export type AboutContent = z.infer<typeof aboutSchema>;
export type ServicesContent = z.infer<typeof servicesSchema>;
export type Service = z.infer<typeof serviceSchema>;

export const CONTENT = {
  home: {
    schema: homeSchema,
    defaults: {
      heroEyebrow: LOCATION,
      heroTitle: "Emotion *framed*\nMemory *cherished*",
      heroTagline: SITE_TAGLINE,
      galleryEyebrow: "Selected work",
      galleryTitle: "The *galleries*",
    } satisfies HomeContent,
  },
  about: {
    schema: aboutSchema,
    defaults: {
      sectionTitle: "Two People\nOne Shared *Vision*",
      caption: "Oskar & Katya",
      paragraphs: ABOUT_PARAGRAPHS,
      pageTitle: "Hi, I'm *Oskar*!",
      intro: OSKAR_INTRO,
    } satisfies AboutContent,
  },
  services: {
    schema: servicesSchema,
    defaults: {
      title: "Ways to *work together*",
      lede: "Every session is built around you. Here's what's included, with starting prices to help you plan. Reach out for a custom quote.",
      items: SERVICES.map((service) => ({ ...service, discountActive: false, discountName: "", discountPercent: 0 })),
    } satisfies ServicesContent,
  },
  contact: {
    schema: contactSchema,
    defaults: {
      eyebrow: "Contact",
      title: "Let’s make *something*.",
      lede: "Tell Oskar about your day, your project, or the print you can’t stop thinking about. Replies usually land within two business days.",
      email: CONTACT_EMAIL,
      instagram: INSTAGRAM_HANDLE,
      location: LOCATION,
    } satisfies ContactContent,
  },
} as const;

export type ContentKey = keyof typeof CONTENT;

// Contact form topics follow the services list, plus a catch-all.
export const OTHER_TOPIC = { value: "other", label: "Something else" };
export function contactTopics(services: Pick<Service, "id" | "title">[]) {
  return [...services.map((service) => ({ value: service.id, label: service.title })), OTHER_TOPIC];
}
