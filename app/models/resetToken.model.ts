import mongoose, { Document, Schema, Types } from "mongoose";

export interface IResetToken extends Document {
  token: string;
  userId: Types.ObjectId;
  isUsed: boolean;
  createdAt: Date;
  expiresAt: Date;
}

const ResetTokenSchema: Schema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'Auth', required: true },
    isUsed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// Index for automatic cleanup of expired tokens
ResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ResetToken = mongoose.model<IResetToken>("ResetToken", ResetTokenSchema); 