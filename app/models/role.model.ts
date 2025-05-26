import mongoose, { Document, Schema } from "mongoose";

export interface IRole extends Document {
  name: string;
  enum: number;
}

const RoleSchema: Schema = new Schema({
  name: { type: String, required: true },
  enum: { type: Number, required: true }
});

export const Role = mongoose.model<IRole>("Role", RoleSchema);
