import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const CheckoutEmailVerificationSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false, index: true },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

CheckoutEmailVerificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export type CheckoutEmailVerificationDoc = InferSchemaType<typeof CheckoutEmailVerificationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CheckoutEmailVerification =
  models.CheckoutEmailVerification ?? model("CheckoutEmailVerification", CheckoutEmailVerificationSchema);
