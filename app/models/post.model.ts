import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPost extends Document {
  userId: Types.ObjectId;
  content: string;
  docUri: string;
  likes: Types.ObjectId[];
}

const PostSchema: Schema = new Schema(
  {
    userId: { type: Types.ObjectId, required: true },
    content: { type: String, required: true },
    docUri: { type: String, required: false, default: "" },
    likes: [{ type: Types.ObjectId }],
  },
  { timestamps: true }
);

export const Post = mongoose.model<IPost>("Post", PostSchema);
