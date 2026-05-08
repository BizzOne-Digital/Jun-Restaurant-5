import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";

const OrderItemSchema = new Schema(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: false },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    selectedOptions: { type: Schema.Types.Mixed, default: {} },
    notes: { type: String, default: "" },
    image: { type: String, default: "" },
  },
  { _id: false }
);

const DeliveryAddressSchema = new Schema(
  {
    line1: String,
    line2: String,
    city: String,
    province: String,
    postal: String,
    country: { type: String, default: "CA" },
  },
  { _id: false }
);

const StatusEmailLogEntrySchema = new Schema(
  {
    status: { type: String, required: true },
    sentAt: { type: Date, required: true },
    recipient: { type: String, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, lowercase: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    /** Legacy field — new orders are always pickup; delivery is no longer offered. */
    orderType: { type: String, enum: ["pickup", "delivery"], required: true },
    /** Canonical serving mode for reporting and emails. */
    servingMode: {
      type: String,
      enum: ["in_store_pickup"],
      default: "in_store_pickup",
    },
    deliveryAddress: { type: DeliveryAddressSchema, default: null },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    promoCode: { type: String, default: "" },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded"],
      default: "unpaid",
    },
    orderStatus: {
      type: String,
      enum: ["pending", "paid", "preparing", "ready", "completed", "cancelled", "refunded"],
      default: "pending",
    },
    stripePaymentIntentId: { type: String, default: "" },
    stripeCheckoutSessionId: { type: String, default: "" },
    /** Idempotency: restaurant / kitchen notification after successful payment */
    restaurantOrderEmailSent: { type: Boolean, default: false },
    restaurantOrderEmailSentAt: { type: Date, default: null },
    /** Legacy timestamp when customer confirmation was sent (pre–Mailgun flags). */
    customerOrderConfirmationSentAt: { type: Date, default: null },
    customerEmailVerified: { type: Boolean, default: false },
    confirmationEmailSent: { type: Boolean, default: false },
    confirmationEmailSentAt: { type: Date, default: null },
    confirmationEmailStatus: { type: String, enum: ["sent", "failed", "skipped"], default: "skipped" },
    confirmationEmailError: { type: String, default: "" },
    statusEmailLog: { type: [StatusEmailLogEntrySchema], default: [] },
    merchantNotificationEmailSent: { type: Boolean, default: false },
    merchantNotificationEmailSentAt: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ orderStatus: 1 });

export type OrderDoc = InferSchemaType<typeof OrderSchema> & { _id: mongoose.Types.ObjectId };

export const Order = models.Order ?? model("Order", OrderSchema);
