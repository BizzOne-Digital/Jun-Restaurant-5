import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";

const SocialLinksSchema = new Schema(
  {
    instagram: { type: String, default: "" },
    facebook: { type: String, default: "" },
    tiktok: { type: String, default: "" },
  },
  { _id: false }
);

const SiteSettingSchema = new Schema(
  {
    restaurantName: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    openingHours: { type: String, default: "Mon–Sun: 11:00 AM – 9:00 PM (placeholder)" },
    socialLinks: { type: SocialLinksSchema, default: {} },
    logo: { type: String, default: "/images/logo.png" },
    heroImages: { type: [String], default: [] },
    /** Restaurant-controlled estimate (in minutes) shown to the customer on the
     * payment-success page and in the order confirmation email. */
    pickupPrepareTimeMinutes: { type: Number, default: 20, min: 1, max: 240 },
  },
  { timestamps: true }
);

export type SiteSettingDoc = InferSchemaType<typeof SiteSettingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SiteSetting = models.SiteSetting ?? model("SiteSetting", SiteSettingSchema);
