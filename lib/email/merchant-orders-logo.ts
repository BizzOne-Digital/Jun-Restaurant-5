/**
 * Logo URL for Merchant Orders–branded customer emails only (not site UI).
 * Set MERCHANT_ORDERS_LOGO_URL to a hosted transparent PNG when ready.
 */
export function getMerchantOrdersLogoUrl(): string {
  const url = process.env.MERCHANT_ORDERS_LOGO_URL?.trim();
  if (url) return url;
  return "{{MERCHANT_ORDERS_LOGO_URL}}";
}
