import Mailgun from "mailgun.js";
import formData from "form-data";

const DEFAULT_FROM_NAME = "Merchant Orders";

/**
 * Mailgun transactional sending. Configure via env; never hardcode API keys.
 */
export function isMailgunConfigured(): boolean {
  const key = Boolean(process.env.MAILGUN_API_KEY?.trim());
  const domain = Boolean(process.env.MAILGUN_DOMAIN?.trim());
  const from =
    Boolean(process.env.MAILGUN_FROM?.trim()) || Boolean(process.env.MAILGUN_FROM_EMAIL?.trim());
  return key && domain && from;
}

/** RFC 5322 From header, e.g. Merchant Orders <orders@merchantorders.io> */
export function resolveMailgunFromHeader(): string {
  const combined = process.env.MAILGUN_FROM?.trim();
  if (combined) {
    const angle = combined.match(/^(.+?)\s*<([^>]+)>\s*$/);
    if (angle) return combined;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(combined)) {
      return `${DEFAULT_FROM_NAME} <${combined}>`;
    }
    return combined;
  }
  const email = process.env.MAILGUN_FROM_EMAIL?.trim();
  if (!email) {
    throw new Error("Set MAILGUN_FROM (e.g. Merchant Orders <orders@merchantorders.io>) or MAILGUN_FROM_EMAIL");
  }
  const name = process.env.MAILGUN_FROM_NAME?.trim() || DEFAULT_FROM_NAME;
  return `${name} <${email}>`;
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
  const from = resolveMailgunFromHeader();
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
