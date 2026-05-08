import { RESTAURANT_DISPLAY_NAME } from "@/lib/email/constants";

export function buildAccountVerificationSubject(): string {
  return `Verify your ${RESTAURANT_DISPLAY_NAME} account`;
}

export function buildAccountVerificationHtml(name: string, verifyUrl: string): string {
  const safeName = escapeHtml(name || "there");
  const safeUrl = escapeHtml(verifyUrl);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:12px;">
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:700;">${RESTAURANT_DISPLAY_NAME}</p>
              <p style="margin:0 0 12px;font-size:15px;">Hi ${safeName},</p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">
                Please verify your email to finish setting up your account.
              </p>
              <a href="${safeUrl}" style="display:inline-block;background:#ffc233;color:#14181c;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:999px;">
                Verify Email
              </a>
              <p style="margin:18px 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
                If the button does not work, copy and paste this link:<br />
                ${safeUrl}
              </p>
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
    .replace(/"/g, "&quot;");
}
