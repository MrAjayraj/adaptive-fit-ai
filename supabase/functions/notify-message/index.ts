/**
 * notify-message — Supabase Edge Function
 *
 * Triggered by PostgreSQL DB triggers (via pg_net) on:
 *   - INSERT into direct_messages  → DM notification email
 *   - INSERT into group_messages   → Group notification email
 *
 * Environment variables required (set via `supabase secrets set`):
 *   RESEND_API_KEY   — from https://resend.com
 *   SITE_URL         — e.g. https://fitpulse.app (for CTA links)
 *
 * Called with verify_jwt: false because it's invoked by pg_net (server-side).
 * The function validates its own internal token via a shared secret header.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DMPayload {
  type:             'dm';
  to_email:         string;
  sender_name:      string;
  message_preview:  string;
  conversation_id:  string;
  receiver_id:      string;
}

interface GroupPayload {
  type:             'group';
  to_email:         string;
  sender_name:      string;
  group_name:       string;
  message_preview:  string;
  group_id:         string;
  receiver_id:      string;
}

type Payload = DMPayload | GroupPayload;

// ─── Brand constants ──────────────────────────────────────────────────────────
const BRAND_ORANGE  = '#FF6B35';
const BRAND_BG      = '#131318';
const BRAND_SURFACE = '#1F1F24';
const BRAND_TEXT    = '#E4E1E9';
const BRAND_MUTED   = '#A98A80';

// ─── Email HTML builder ───────────────────────────────────────────────────────
function buildEmailHtml(opts: {
  preheader:   string;
  headline:    string;
  body:        string;
  ctaText:     string;
  ctaUrl:      string;
  siteUrl:     string;
}): string {
  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FitPulse Notification</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:'Inter','Helvetica Neue',Arial,sans-serif;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;overflow:hidden;max-height:0;mso-hide:all;">${opts.preheader}&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;</div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_BG};padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table role="presentation" width="100%" style="max-width:520px;background:${BRAND_SURFACE};border-radius:20px;overflow:hidden;border:1px solid rgba(89,65,57,0.22);">

          <!-- Header gradient bar -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_ORANGE} 0%,#FF9A35 100%);padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:28px;line-height:1;">💪</p>
              <p style="margin:8px 0 0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">FitPulse</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">

              <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:${BRAND_TEXT};line-height:1.3;">
                ${opts.headline}
              </h1>

              <!-- Message preview bubble -->
              <table role="presentation" width="100%" style="margin:16px 0;">
                <tr>
                  <td style="background:#2A292F;border-radius:12px;padding:14px 16px;border-left:3px solid ${BRAND_ORANGE};">
                    <p style="margin:0;font-size:15px;color:${BRAND_TEXT};line-height:1.5;">
                      ${opts.body}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table role="presentation" width="100%" style="margin-top:24px;">
                <tr>
                  <td align="center">
                    <a href="${opts.ctaUrl}"
                       style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:12px;letter-spacing:0.2px;box-shadow:0 4px 14px rgba(255,107,53,0.4);">
                      ${opts.ctaText}
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid rgba(89,65,57,0.15);">
              <p style="margin:0;font-size:12px;color:${BRAND_MUTED};text-align:center;line-height:1.6;">
                You're receiving this because you have email notifications enabled.<br />
                <a href="${opts.siteUrl}/settings/notifications" style="color:${BRAND_ORANGE};text-decoration:none;">Manage preferences</a>
                &nbsp;·&nbsp;
                <a href="${opts.siteUrl}/unsubscribe" style="color:${BRAND_ORANGE};text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ─── Send email via Resend ────────────────────────────────────────────────────
async function sendEmail(opts: {
  to:      string;
  subject: string;
  html:    string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from:    'FitPulse <notifications@fitpulse.app>',
      to:      [opts.to],
      subject: opts.subject,
      html:    opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body };
  }
  return { ok: true };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let payload: Payload;
  try {
    payload = await req.json() as Payload;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate required fields
  if (!payload.type || !payload.to_email || !payload.sender_name) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://fitpulse.app';

  let emailResult: { ok: boolean; error?: string };

  // ── DM notification ────────────────────────────────────────────────────────
  if (payload.type === 'dm') {
    const p = payload as DMPayload;
    const preview = p.message_preview.length > 80
      ? `${p.message_preview.slice(0, 80)}…`
      : p.message_preview;

    const html = buildEmailHtml({
      preheader: `${p.sender_name} sent you a message on FitPulse`,
      headline:  `${p.sender_name} sent you a message 💬`,
      body:      preview,
      ctaText:   'Reply in FitPulse',
      ctaUrl:    `${siteUrl}/social/dm/${p.conversation_id}`,
      siteUrl,
    });

    emailResult = await sendEmail({
      to:      p.to_email,
      subject: `${p.sender_name} sent you a message on FitPulse`,
      html,
    });
  }

  // ── Group notification ─────────────────────────────────────────────────────
  else if (payload.type === 'group') {
    const p = payload as GroupPayload;
    const preview = p.message_preview.length > 80
      ? `${p.message_preview.slice(0, 80)}…`
      : p.message_preview;

    const groupLabel = p.group_name ?? 'your group';
    const html = buildEmailHtml({
      preheader: `${p.sender_name} posted in ${groupLabel} on FitPulse`,
      headline:  `New message in ${groupLabel} 🏋️`,
      body:      `<strong>${p.sender_name}:</strong> ${preview}`,
      ctaText:   'View in FitPulse',
      ctaUrl:    `${siteUrl}/social/groups/${p.group_id}`,
      siteUrl,
    });

    emailResult = await sendEmail({
      to:      p.to_email,
      subject: `${p.sender_name} posted in ${groupLabel}`,
      html,
    });
  }

  // ── Unknown type ───────────────────────────────────────────────────────────
  else {
    return new Response(JSON.stringify({ error: 'Unknown notification type' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!emailResult!.ok) {
    console.error('[notify-message] Resend error:', emailResult!.error);
    return new Response(
      JSON.stringify({ success: false, error: emailResult!.error }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
