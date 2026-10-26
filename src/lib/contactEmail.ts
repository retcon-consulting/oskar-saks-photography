import { EMAIL_COLORS, escapeHtml, FONT_BODY, FONT_DISPLAY, FONT_MONO, renderButton, renderEmailLayout } from "@/lib/emailLayout";
import { SITE_NAME } from "@/lib/siteConfig";

type ContactEmailInput = {
  name: string;
  email: string;
  phone?: string;
  topicLabel: string;
  date?: string;
  message: string;
};

// The sender's name goes into the subject, so it can't carry line breaks.
export const toSingleLine = (value: string) => value.replace(/\s+/g, " ").trim();

function detailRow(label: string, valueHtml: string): string {
  return `<tr>
<td valign="top" style="padding:10px 16px 10px 0;width:120px;border-bottom:1px solid ${EMAIL_COLORS.line};font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${EMAIL_COLORS.inkSoft};">${label}</td>
<td valign="top" style="padding:10px 0;border-bottom:1px solid ${EMAIL_COLORS.line};font-family:${FONT_BODY};font-size:15px;line-height:1.5;color:${EMAIL_COLORS.ink};">${valueHtml}</td>
</tr>`;
}

export function renderContactEmail({ name, email, phone, topicLabel, date, message }: ContactEmailInput) {
  const senderName = toSingleLine(name);
  const firstName = senderName.split(" ")[0] || "them";
  const link = (href: string, text: string) =>
    `<a href="${escapeHtml(href)}" style="color:${EMAIL_COLORS.accentDeep};text-decoration:none;">${escapeHtml(text)}</a>`;

  const rows = [
    detailRow("Email", link(`mailto:${encodeURIComponent(email)}`, email)),
    phone ? detailRow("Phone", link(`tel:${phone.replace(/[^\d+]/g, "")}`, phone)) : "",
    detailRow("Interested in", escapeHtml(topicLabel)),
    date ? detailRow("Date / timing", escapeHtml(date)) : "",
  ].join("\n");

  const bodyHtml = `<h1 style="margin:0 0 6px;font-family:${FONT_DISPLAY};font-size:24px;line-height:1.2;font-weight:normal;color:${EMAIL_COLORS.ink};">${escapeHtml(senderName)} sent you a message</h1>
<p style="margin:0 0 24px;font-family:${FONT_BODY};font-size:15px;line-height:1.5;color:${EMAIL_COLORS.inkSoft};">New inquiry from the contact form on your website.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid ${EMAIL_COLORS.line};">
${rows}
</table>
<div style="margin:0 0 24px;padding:18px 20px;background-color:${EMAIL_COLORS.panel};border-left:3px solid ${EMAIL_COLORS.accent};border-radius:6px;font-family:${FONT_BODY};font-size:16px;line-height:1.65;color:${EMAIL_COLORS.ink};white-space:pre-wrap;">${escapeHtml(message)}</div>
${renderButton(`Reply to ${firstName}`, `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Re: ${topicLabel}`)}`)}`;

  const footerHtml = `Sent from the contact form at ${escapeHtml(SITE_NAME)}. Replying to this email goes straight to ${escapeHtml(email)}.`;

  const html = renderEmailLayout({
    title: `${SITE_NAME}: ${topicLabel} inquiry from ${senderName}`,
    eyebrow: "New inquiry",
    preheader: `${senderName} is interested in ${topicLabel}: ${toSingleLine(message).slice(0, 90)}`,
    bodyHtml,
    footerHtml,
  });

  const text = [
    `Name: ${senderName}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    `Interested in: ${topicLabel}`,
    date ? `Date / timing: ${date}` : null,
    "",
    message,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return { html, text, senderName };
}
