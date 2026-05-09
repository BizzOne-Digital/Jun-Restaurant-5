import { connectDB } from "@/lib/mongodb";
import { SiteSetting } from "@/models/SiteSetting";
import { resolveEmailLogoUrl } from "@/lib/email/restaurant-logo";
import { DEFAULT_PICKUP_PREPARE_MINUTES, RESTAURANT_DISPLAY_NAME } from "@/lib/email/constants";

export type RestaurantEmailContext = {
  restaurantName: string;
  /** Absolute logo URL or null when none is configured. */
  logoUrl: string | null;
  pickupPrepareMinutes: number;
  /** Email used as From / Reply-To when restaurant has no override env. */
  email: string | null;
};

type SiteSettingLean = {
  restaurantName?: string;
  email?: string;
  logo?: string;
  pickupPrepareTimeMinutes?: number;
};

export async function loadRestaurantEmailContext(siteOrigin: string): Promise<RestaurantEmailContext> {
  await connectDB();
  const settings = await SiteSetting.findOne()
    .sort({ updatedAt: -1 })
    .lean<SiteSettingLean | null>();

  const restaurantName = settings?.restaurantName?.trim() || RESTAURANT_DISPLAY_NAME;
  const logoUrl = resolveEmailLogoUrl(settings?.logo, siteOrigin);
  const pickupPrepareMinutes =
    typeof settings?.pickupPrepareTimeMinutes === "number" && settings.pickupPrepareTimeMinutes > 0
      ? settings.pickupPrepareTimeMinutes
      : DEFAULT_PICKUP_PREPARE_MINUTES;
  const email = settings?.email?.trim() || null;

  return { restaurantName, logoUrl, pickupPrepareMinutes, email };
}
