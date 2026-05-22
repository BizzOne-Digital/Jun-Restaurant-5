/**
 * lib/payment-config.ts
 *
 * Stripe Connect split settings for ONO Poké Bar — Western Battery location.
 *
 * These values are intentionally hardcoded server-side so that restaurant/admin
 * users cannot view or modify the commission rate, destination account, or
 * payment mode from the admin portal.
 *
 * NEVER import this file in client/browser code.
 * NEVER prefix these values with NEXT_PUBLIC_.
 */

/** Stripe Connect destination account for ONO Poké Bar — Western Battery. */
export const ONO_POKE_STRIPE_CONNECTED_ACCOUNT_ID = "acct_1TZOfBGvC42aJV8M";

/** Platform commission: 12% of every transaction. Restaurant receives 88%. */
export const PLATFORM_COMMISSION_RATE = 0.12;

/** Identifies this checkout flow in Stripe metadata and order records. */
export const PAYMENT_MODE = "stripe_connect_split" as const;

/**
 * Returns the platform application fee in cents (12% of the charge amount).
 * @param amountInCents - Total charge amount in the smallest currency unit (e.g. CAD cents).
 */
export function calculatePlatformFee(amountInCents: number): number {
  return Math.round(amountInCents * PLATFORM_COMMISSION_RATE);
}

/**
 * Returns the restaurant payout in cents (88% of the charge amount).
 * @param amountInCents - Total charge amount in the smallest currency unit.
 */
export function calculateRestaurantPayout(amountInCents: number): number {
  return amountInCents - calculatePlatformFee(amountInCents);
}
