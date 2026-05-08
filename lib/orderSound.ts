/**
 * Built-in order notification chime for the web admin dashboard.
 * The same public asset path (`/sounds/order-notification.mp3`) can be bundled
 * or fetched in a future React Native / mobile staff app for parity.
 */
const SOUND_URL = "/sounds/order-notification.mp3";
const VOLUME = 0.8;

export function playOrderNotificationSound(): void {
  try {
    if (typeof window === "undefined") return;
    const audio = new Audio(SOUND_URL);
    audio.volume = VOLUME;
    void audio.play().catch(() => {
      /* Autoplay policy or missing file — ignore silently */
    });
  } catch {
    /* Invalid Audio construction — ignore */
  }
}
