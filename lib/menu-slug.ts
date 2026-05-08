import mongoose from "mongoose";
import { MenuItem } from "@/models/MenuItem";

/** Reserve a unique `slug` for menu items; optionally ignore the document being edited. */
export async function allocateUniqueMenuSlug(
  baseSlug: string,
  options?: { excludeItemId?: string }
): Promise<string> {
  let slug = baseSlug;
  let n = 1;
  while (true) {
    const query: Record<string, unknown> = { slug };
    const exclude = options?.excludeItemId;
    if (exclude && mongoose.Types.ObjectId.isValid(exclude)) {
      query._id = { $ne: new mongoose.Types.ObjectId(exclude) };
    }
    const taken = await MenuItem.exists(query);
    if (!taken) return slug;
    slug = `${baseSlug}-${n++}`;
  }
}
