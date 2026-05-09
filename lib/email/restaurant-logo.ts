/**
 * Resolve a restaurant logo path/URL into an absolute URL suitable for
 * embedding in transactional emails.
 *
 * Email clients fetch images over the open internet; relative paths like
 * "/images/logo.png" only work once they are joined with the public site
 * origin. If no logo is configured, returns null so the template can hide
 * the image entirely instead of rendering a broken icon.
 */
export function resolveEmailLogoUrl(
  logoPathOrUrl: string | null | undefined,
  siteOrigin: string
): string | null {
  const raw = logoPathOrUrl?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin = siteOrigin.replace(/\/$/, "");
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${origin}${path}`;
}
