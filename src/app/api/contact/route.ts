import { NextResponse } from "next/server";
import { Resend } from "resend";
import { contactSchema } from "@/lib/contactValidation";
import { renderContactEmail } from "@/lib/contactEmail";
import { contactTopics } from "@/lib/contentSchema";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { getContactContent, getServicesContent } from "@/lib/siteContent";
import { SITE_NAME } from "@/lib/siteConfig";

const MAX_BODY_BYTES = 20 * 1024;
// A person needs longer than this to fill in the form; a script posting it the moment the page loads doesn't.
const MIN_FILL_MS = 3000;
const MAX_LINKS = 2;

const IP_RULES = [
  { limit: 3, windowMs: 10 * 60 * 1000 },
  { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
];
const EMAIL_RULES = [{ limit: 2, windowMs: 60 * 60 * 1000 }];
// Caps what one flood can send overall (and what it can spend of the Resend quota), whoever it comes from.
const GLOBAL_RULES = [{ limit: 30, windowMs: 60 * 60 * 1000 }];

const tooMany = (retryAfterSeconds: number) =>
  NextResponse.json(
    { error: "You've sent several messages recently. Please try again a little later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );

// Browsers always send Origin on a cross-site or same-site POST; a request without it, or from another site, isn't our form.
function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`contact:ip:${ip}`, IP_RULES);
  if (!ipLimit.ok) return tooMany(ipLimit.retryAfterSeconds);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Message is too large." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    const parsedBody: unknown = JSON.parse(raw);
    if (typeof parsedBody !== "object" || parsedBody === null) throw new Error("bad body");
    body = parsedBody as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Bots get a convincing "sent" and nothing else: a filled-in hidden field, or a form posted faster than a person could.
  const { website, startedAt, ...fields } = body;
  const filledTooFast = typeof startedAt !== "number" || Date.now() - startedAt < MIN_FILL_MS;
  if ((typeof website === "string" && website.trim() !== "") || filledTooFast) {
    return NextResponse.json({ success: true }, { status: 201 });
  }

  const parsed = contactSchema.safeParse(fields);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check the form and try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if ((parsed.data.message.match(/https?:\/\/|www\./gi) ?? []).length > MAX_LINKS) {
    return NextResponse.json({ error: "Please keep links out of your message." }, { status: 400 });
  }

  const emailLimit = checkRateLimit(`contact:email:${parsed.data.email.toLowerCase()}`, EMAIL_RULES);
  if (!emailLimit.ok) return tooMany(emailLimit.retryAfterSeconds);
  const globalLimit = checkRateLimit("contact:all", GLOBAL_RULES);
  if (!globalLimit.ok) return tooMany(globalLimit.retryAfterSeconds);

  const { name, email, phone, topic, date, message } = parsed.data;
  const topicLabel = contactTopics((await getServicesContent()).items).find((item) => item.value === topic)?.label;
  if (!topicLabel) return NextResponse.json({ error: "Please choose what you're interested in." }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  // An explicit CONTACT_TO_EMAIL wins; otherwise messages go to the address shown on the site (editable in the admin).
  const to = process.env.CONTACT_TO_EMAIL ?? (await getContactContent()).email;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[contact] RESEND_API_KEY / CONTACT_FROM_EMAIL not set. Message:", parsed.data);
      return NextResponse.json({ success: true }, { status: 201 });
    }
    console.error("[contact] Email is not configured.");
    return NextResponse.json({ error: "We could not send your message. Please try again later." }, { status: 500 });
  }

  const { html, text, senderName } = renderContactEmail({ name, email, phone, topicLabel, date, message });
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `${SITE_NAME}: ${topicLabel} inquiry from ${senderName}`,
    text,
    html,
  });

  if (error) {
    console.error("[contact] Resend error:", error);
    return NextResponse.json({ error: "We could not send your message. Please try again later." }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
