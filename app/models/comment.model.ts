import mongoose, { Document, Schema, Types } from "mongoose";

export interface IComment extends Document {
  postId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
}

const CommentSchema: Schema = new Schema(
  {
    postId: { type: Types.ObjectId, required: true, ref: "Post" },
    userId: { type: Types.ObjectId, required: true, ref: "User" },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export const Comment = mongoose.model<IComment>("Comment", CommentSchema);
