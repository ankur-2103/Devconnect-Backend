import mongoose, { Document, Schema } from "mongoose";

export interface IAuth extends Document {
  username: string;
  email: string;
  password: string;
  roles: number[];
}

export interface AuthUser {
  _id: string; // This will match auth._id
  name: string;
  bio: string;
  skills: string;
  social: {
    github: string;
    linkedin: string;
    twitter: string;
    website: string;
  };
  avatar: string;
  roles: number[];
  createdAt: string;
  updatedAt: string;
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
