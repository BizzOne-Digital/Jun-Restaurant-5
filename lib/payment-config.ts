/**
 * lib/payment-config.ts
 *
 * Payment configuration for ONO Poké Bar — Georgetown location.
 *
 * Split payment (platform fee / Stripe Connect destination charge) is DISABLED
 * for this location. All payments go directly to the restaurant's Stripe account.
 *
 * NEVER import this file in client/browser code.
 * NEVER prefix these values with NEXT_PUBLIC_.
 */

/** Split payment is disabled for this location — direct Stripe payment only. */
export const SPLIT_PAYMENT_ENABLED = false;

/** No connected account for this location — direct payment, no platform fee. */
export const ONO_POKE_STRIPE_CONNECTED_ACCOUNT_ID = "";

/** Platform commission: 0% — no fee for this location. */
export const PLATFORM_COMMISSION_RATE = 0;

/** Identifies this checkout flow in Stripe metadata and order records. */
export const PAYMENT_MODE = "stripe_direct" as const;

/**
 * Returns the platform application fee in cents.
 * Always 0 for this location (split payment disabled).
 */
export function calculatePlatformFee(_amountInCents: number): number {
  return 0;
}

/**
 * Returns the restaurant payout in cents.
 * Full amount for this location (no platform fee).
 */
export function calculateRestaurantPayout(amountInCents: number): number {
  return amountInCents;
}
