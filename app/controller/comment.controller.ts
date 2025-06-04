import { Request, Response } from "express";
import { Comment, IComment } from "../models/comment.model";
import { Types } from "mongoose";
import { RoleEnum } from "../enums/role.enum";

interface CommentRequest extends Request {
  body: {
    content: string;
    postId: string;
  };
}

// Create a new comment
const createComment = async (
  req: CommentRequest,
  res: Response
): Promise<void> => {
  try {
    const { postId, content } = req.body;

    if (!req.metadata?.id) {
      res.status(401).send({ message: "Unauthorized" });
      return;
    }

    if (!Types.ObjectId.isValid(postId)) {
      res.status(400).send({ message: "Invalid postId" });
      return;
    }

    const comment = new Comment({
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId((req.metadata.id as string) || ""),
      content,
    });

    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate({
      path: "userId",
      select: "name avatar",
      model: "User",
    });

    res.status(201).send(populatedComment);
  } catch (err) {
    res.status(500).send({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

// Get all comments for a specific post
const getCommentsByPostId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { postId } = req.params;

    if (!Types.ObjectId.isValid(postId)) {
      res.status(400).send({ message: "Invalid postId" });
      return;
    }

    const comments = await Comment.find({ postId })
      .sort({ createdAt: -1 })
      .populate({
        path: "userId",
        select: "name avatar",
        model: "User",
      });

    res.status(200).send(comments);
  } catch (err) {
    res.status(500).send({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

// Get a comment by ID
const getCommentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const comment = await Comment.findById(req.params.id).populate({
      path: "userId",
      select: "name avatar",
      model: "User",
    });

    if (!comment) {
      res.status(404).send({ message: "Comment not found" });
      return;
    }

    res.status(200).send(comment);
  } catch (err) {
    res.status(500).send({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

import { Post } from "../models/post.model"; // Ensure you import the Post model

// Update a comment
const updateComment = async (
  req: CommentRequest,
  res: Response
): Promise<void> => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      res.status(404).send({ message: "Comment not found" });
      return;
    }

    const userId = req.metadata?.id;
    const isAdmin = req.metadata?.roles.includes(RoleEnum.admin.enum);

    // Get post to check if the current user is the post owner
    const post = await Post.findById(comment.postId);
    const isPostOwner = post?.userId.toString() === userId;
    const isCommentOwner = comment.userId.toString() === userId;

    if (!isAdmin && !isPostOwner && !isCommentOwner) {
      res
        .status(403)
        .send({ message: "Not authorized to update this comment" });
      return;
    }

    comment.content = req.body.content;
    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate({
      path: "userId",
      select: "name avatar",
      model: "User",
    });

    res.status(200).send(populatedComment);
  } catch (err) {
    res.status(500).send({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

// Delete a comment
const deleteComment = async (
  req: CommentRequest,
  res: Response
): Promise<void> => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      res.status(404).send({ message: "Comment not found" });
      return;
    }

    const userId = req.metadata?.id;
    const isAdmin = req.metadata?.roles.includes(RoleEnum.admin.enum);

    // Get post to check if the current user is the post owner
    const post = await Post.findById(comment.postId);
    const isPostOwner = post?.userId.toString() === userId;
    const isCommentOwner = comment.userId.toString() === userId;

    if (!isAdmin && !isPostOwner && !isCommentOwner) {
      res
        .status(403)
        .send({ message: "Not authorized to delete this comment" });
      return;
    }

    await Comment.findByIdAndDelete(req.params.id);
    res.status(200).send({ message: "Comment deleted successfully" });
  } catch (err) {
    res.status(500).send({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

export default {
  createComment,
  getCommentsByPostId,
  getCommentById,
  updateComment,
  deleteComment,
};
