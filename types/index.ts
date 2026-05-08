import type { Document } from "mongoose";

/** Stored on orders for legacy data; new checkout only creates pickup. */
export type OrderType = "pickup" | "delivery";
export type ServingMode = "in_store_pickup";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";
export type OrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "refunded";

export type PromotionType = "percentage" | "fixed";

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  selectedOptions?: Record<string, unknown>;
  notes?: string;
  image?: string;
  /** Marks BYO line items */
  isBuildBowl?: boolean;
}

export interface BuildBowlSelection {
  size: "small" | "regular";
  base: string;
  protein: string;
  toppings: string[];
  crunch: string[];
  sauce: string[];
}

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: "user" | "admin";
};

export type WithTimestamps = {
  createdAt: Date;
  updatedAt: Date;
};

export type PopulatedDoc<T> = T & Document;
