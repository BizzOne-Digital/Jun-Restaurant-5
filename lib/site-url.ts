/** Public site origin for Stripe redirect URLs — no trailing slash */
export function assertPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is required (e.g. http://localhost:3000). Set it in .env.local for Stripe success/cancel redirects."
    );
  }
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_SITE_URL must be http or https");
    }
    return raw.replace(/\/$/, "");
  } catch {
    throw new Error(`NEXT_PUBLIC_SITE_URL is not a valid URL: "${raw}"`);
  }
}

/** Join site origin + path without double slashes (base has no trailing slash). */
export function publicSiteUrlWithPath(path: string): string {
  const base = assertPublicSiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
