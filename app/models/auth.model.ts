import mongoose, { Document, Schema } from "mongoose";

export interface IAuth extends Document {
  username: string;
  email: string;
  password: string;
  roles: number[];
}

const AuthSchema: Schema = new Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    roles: [{ type: Number, required: true }],
  },
  { timestamps: true }
);

export const Auth = mongoose.model<IAuth>("Auth", AuthSchema);
