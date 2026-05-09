/** Public restaurant identity used as a fallback when SiteSetting is missing. */
export const RESTAURANT_DISPLAY_NAME = "ONO Poké Bar";
export const RESTAURANT_ADDRESS_LINES = [
  "ONO Poké Bar",
  "100 Western Battery Rd #2",
  "Toronto, ON M6K 3S2",
] as const;

/** Default fallback prep time in minutes when SiteSetting has none configured. */
export const DEFAULT_PICKUP_PREPARE_MINUTES = 20;

/** Format minutes as a human label, e.g. "20 minutes" or "1 minute". */
export function formatPickupPrepareWindow(minutes: number): string {
  const m = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : DEFAULT_PICKUP_PREPARE_MINUTES;
  return `${m} ${m === 1 ? "minute" : "minutes"}`;
}
