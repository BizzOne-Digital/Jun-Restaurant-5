import Mailgun from "mailgun.js";
import formData from "form-data";

/**
 * Mailgun transactional sending for ONO Poké Bar.
 * Same patterns can be reused from a future React Native / mobile admin app.
 */
export function isMailgunConfigured(): boolean {
  return Boolean(
    process.env.MAILGUN_API_KEY?.trim() &&
      process.env.MAILGUN_DOMAIN?.trim() &&
      process.env.MAILGUN_FROM_EMAIL?.trim()
  );
}

function mailgunClient() {
  const key = process.env.MAILGUN_API_KEY?.trim();
  const domain = process.env.MAILGUN_DOMAIN?.trim();
  if (!key || !domain) {
    throw new Error("MAILGUN_API_KEY and MAILGUN_DOMAIN are required to send email");
  }
  const mailgun = new Mailgun(formData);
  return { mg: mailgun.client({ username: "api", key }), domain };
}

export type SendMailgunParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
};

export async function sendMailgunEmail(params: SendMailgunParams): Promise<unknown> {
  const fromEmail = process.env.MAILGUN_FROM_EMAIL?.trim();
  const fromName = process.env.MAILGUN_FROM_NAME?.trim() || "Merchant Orders";
  if (!fromEmail) {
    throw new Error("MAILGUN_FROM_EMAIL is required");
  }
  const from = `${fromName} <${fromEmail}>`;
  const { mg, domain } = mailgunClient();

  const to = Array.isArray(params.to) ? params.to : [params.to];

  const result = await mg.messages.create(domain, {
    from,
    to,
    subject: params.subject,
    html: params.html,
    text: params.text ?? stripHtml(params.html),
    ...(params.cc?.length ? { cc: params.cc } : {}),
    ...(params.bcc?.length ? { bcc: params.bcc } : {}),
    ...(params.replyTo ? { "h:Reply-To": params.replyTo } : {}),
  });
  console.info("Mailgun send response", { to, subject: params.subject, result });
  return result;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
