import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SiteSetting } from "@/models/SiteSetting";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  restaurantName: "ONO Poké Bar",
  address: "100 Western Battery Rd #2, Toronto, ON M6K 3S2",
  phone: "(416) 000-0000",
  email: "hello@onopokebar.com",
  openingHours: "Mon–Sun: 11:00 AM – 9:00 PM",
  socialLinks: { instagram: "", facebook: "", tiktok: "" },
  logo: "/images/logo.png",
  heroImages: [] as string[],
};

export async function GET() {
  try {
    await connectDB();
    const doc = await SiteSetting.findOne().sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ settings: doc ?? DEFAULTS });
  } catch {
    return NextResponse.json({ settings: DEFAULTS });
  }
}
