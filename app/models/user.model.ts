import mongoose, { Document, Schema, Types } from "mongoose";

export interface SearchUser {
  _id: string;
  name: string;
  bio: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId; // This will match auth._id
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
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true }, // This will be set to match auth._id
    name: { type: String, default: "" },
    bio: { type: String, default: "" },
    skills: { type: String, default: "" },
    social: {
      github: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      twitter: { type: String, default: "" },
      website: { type: String, default: "" },
    },
    avatar: { type: String, default: "" },
  },
  {
    timestamps: true, // This will automatically add createdAt and updatedAt fields
  }
);

// Add a pre-save middleware to ensure _id matches auth._id
UserSchema.pre("save", async function (next) {
  if (!this.isNew) {
    return next();
  }

  try {
    const Auth = mongoose.model("Auth");
    const auth = await Auth.findById(this._id);
    if (!auth) {
      throw new Error("Auth document must exist before creating User");
    }
    next();
  } catch (error: any) {
    next(error);
  }
});

export const User = mongoose.model<IUser>("User", UserSchema);
