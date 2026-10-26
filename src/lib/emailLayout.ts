import { SITE_NAME } from "@/lib/siteConfig";

// The site's palette (see globals.scss) as plain hex: email clients don't read CSS variables or hsl().
export const EMAIL_COLORS = {
  ink: "#1d2839",
  inkSoft: "#5b677b",
  paper: "#f8fafc",
  panel: "#eef2f7",
  surface: "#ffffff",
  line: "#dfe5ee",
  accent: "#0e68dd",
  accentDeep: "#1e47b8",
  accentSoft: "#deecfc",
  onAccent: "#ffffff",
};

// Web fonts don't load in most mail apps, so each of the site's three faces gets a close system stand-in.
export const FONT_DISPLAY = "'Young Serif',Georgia,'Times New Roman',serif";
export const FONT_BODY = "'Schibsted Grotesk','Segoe UI',Helvetica,Arial,sans-serif";
export const FONT_MONO = "'DM Mono',ui-monospace,Menlo,Consolas,monospace";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;">
<tr>
<td bgcolor="${EMAIL_COLORS.accentDeep}" style="border-radius:8px;background-color:${EMAIL_COLORS.accentDeep};background-image:linear-gradient(135deg,${EMAIL_COLORS.accent},${EMAIL_COLORS.accentDeep});">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;font-family:${FONT_MONO};font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${EMAIL_COLORS.onAccent};text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
</td>
</tr>
</table>`;
}

export function renderEmailLayout({
  title,
  eyebrow,
  preheader,
  bodyHtml,
  footerHtml,
}: {
  title: string;
  eyebrow: string;
  preheader: string;
  bodyHtml: string;
  footerHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_COLORS.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${EMAIL_COLORS.paper};">
<tr>
<td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:${EMAIL_COLORS.surface};border:1px solid ${EMAIL_COLORS.line};border-radius:16px;overflow:hidden;">
<tr>
<td bgcolor="${EMAIL_COLORS.accentDeep}" style="background-color:${EMAIL_COLORS.accentDeep};background-image:linear-gradient(135deg,${EMAIL_COLORS.accent},${EMAIL_COLORS.accentDeep});padding:36px 32px;">
<div style="font-family:${FONT_MONO};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${EMAIL_COLORS.accentSoft};">${escapeHtml(eyebrow)}</div>
<div style="margin-top:10px;font-family:${FONT_DISPLAY};font-size:28px;line-height:1.15;letter-spacing:-0.01em;color:${EMAIL_COLORS.onAccent};">${escapeHtml(SITE_NAME)}</div>
</td>
</tr>
<tr>
<td style="padding:32px;">
${bodyHtml}
</td>
</tr>
<tr>
<td style="padding:16px 32px 24px;border-top:1px solid ${EMAIL_COLORS.line};font-family:${FONT_BODY};font-size:12px;line-height:1.5;color:${EMAIL_COLORS.inkSoft};">
${footerHtml}
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}
