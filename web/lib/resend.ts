/**
 * Resend transactional-email helper. Used by the Stripe webhook for purchase
 * confirmations, and anywhere else we need to send a one-off email that
 * shouldn't go through Supabase's auth flows.
 *
 * Auth emails (signup confirmation, magic links, password resets) route
 * through Supabase's SMTP setting, which is configured to use Resend in the
 * Supabase dashboard. Code paths in this app should not call this helper for
 * anything Supabase already handles.
 */

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const FROM =
  process.env.RESEND_FROM_EMAIL || "Ray AI <noreply@tgfx-academy.com>";

let _resend: Resend | null = null;
function getResend() {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY missing — cannot send email.");
  }
  if (!_resend) _resend = new Resend(apiKey);
  return _resend;
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Override the default From for one-off senders (e.g. ray@…). */
  from?: string;
};

/**
 * Send a transactional email. Returns the Resend message id on success and
 * logs+throws on failure so the caller decides whether to swallow or surface.
 */
export async function sendEmail(input: SendEmailInput): Promise<string> {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: input.from || FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  if (error) {
    console.error("[resend] send failed", error);
    throw new Error(`resend: ${error.message}`);
  }
  return data?.id || "";
}

/**
 * Branded HTML wrapper for transactional emails. Keeps every Ray AI
 * email visually consistent — emerald accents, dark background, simple CTA.
 * Pass `body` as raw HTML; this wrapper handles the layout, headers, footer.
 */
export function brandedEmail({
  preheader,
  heading,
  body,
  ctaUrl,
  ctaLabel,
}: {
  /** Preview text shown in email clients before the user opens. */
  preheader: string;
  heading: string;
  /** Inner HTML for the main message body. Multiple <p>s are fine. */
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Ray AI</title>
  </head>
  <body style="margin:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e4e4e7;">
    <span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0a0a0a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#18181b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <table width="100%"><tr>
                  <td style="font-weight:700;font-size:16px;color:#fff;">
                    Ray AI<sup style="font-size:9px;color:#71717a;">™</sup>
                  </td>
                  <td align="right" style="font-size:11px;color:#71717a;letter-spacing:0.12em;text-transform:uppercase;">
                    by TGFX
                  </td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#fff;font-weight:700;">${escapeHtml(heading)}</h1>
                <div style="font-size:14px;line-height:1.6;color:#a1a1aa;">${body}</div>
                ${
                  ctaUrl && ctaLabel
                    ? `<div style="margin-top:28px;">
                  <a href="${escapeAttr(ctaUrl)}" style="display:inline-block;padding:12px 22px;background:linear-gradient(135deg,#34d399,#14b8a6);color:#0a0a0a;font-weight:700;text-decoration:none;border-radius:12px;font-size:14px;">${escapeHtml(ctaLabel)}</a>
                </div>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#52525b;line-height:1.5;">
                You're receiving this because you have an account at <a href="https://tgfx-academy.com" style="color:#a1a1aa;text-decoration:none;">tgfx-academy.com</a>.
                <br />
                Ray AI™ by TGFX Academy · <a href="https://tgfx-academy.com/billing" style="color:#a1a1aa;text-decoration:none;">manage subscription</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
