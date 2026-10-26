import { NextResponse } from "next/server";
import { Resend } from "resend";
import { contactSchema } from "@/lib/contactValidation";
import { renderContactEmail } from "@/lib/contactEmail";
import { contactTopics } from "@/lib/contentSchema";
import { getContactContent, getServicesContent } from "@/lib/siteContent";
import { SITE_NAME } from "@/lib/siteConfig";

const MAX_BODY_BYTES = 20 * 1024;

export async function POST(request: Request) {
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

  const { website, ...fields } = body;
  if (typeof website === "string" && website.trim() !== "") {
    return NextResponse.json({ success: true }, { status: 201 });
  }

  const parsed = contactSchema.safeParse(fields);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check the form and try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

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
