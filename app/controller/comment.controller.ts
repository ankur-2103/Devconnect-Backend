import { Request, Response } from "express";
import { Comment, IComment } from "../models/comment.model";
import { Types } from "mongoose";
import { RoleEnum } from "../enums/role.enum";
import { PaginatedResponse } from "../models/common.model";

interface CommentRequest extends Request {
  body: {
    content: string;
    postId: string;
  };
  query: {
    page?: string;
    limit?: string;
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

    const populatedComment = await Comment.aggregate([
      {
        $match: {
          _id: comment._id
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 1,
          content: 1,
          postId: 1,
          createdAt: 1,
          updatedAt: 1,
          'user._id': 1,
          'user.name': 1,
          'user.avatar': 1
        }
      }
    ]);

    res.status(201).send(populatedComment[0]);
  } catch (err) {
    res.status(500).send({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

// Get all comments for a specific post
const getCommentsByPostId = async (
  req: CommentRequest,
  res: Response
): Promise<void> => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const skip = (page - 1) * limit;

    if (!Types.ObjectId.isValid(postId)) {
      res.status(400).send({ message: "Invalid postId" });
      return;
    }

    const [comments, total] = await Promise.all([
      Comment.aggregate([
        {
          $match: { postId: new Types.ObjectId(postId) }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            _id: 1,
            content: 1,
            postId: 1,
            createdAt: 1,
            updatedAt: 1,
            'user._id': 1,
            'user.name': 1,
            'user.avatar': 1
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $skip: skip
        },
        {
          $limit: limit
        }
      ]),
      Comment.countDocuments({ postId })
    ]);

    const hasMore = skip + comments.length < total;

    const response: PaginatedResponse<IComment> = {
      items: comments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasMore,
      },
    };

    res.status(200).send(response);
  } catch (err) {
    res.status(500).send({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

// Get a comment by ID
const getCommentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const comment = await Comment.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(req.params.id)
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 1,
          content: 1,
          postId: 1,
          createdAt: 1,
          updatedAt: 1,
          'user._id': 1,
          'user.name': 1,
          'user.avatar': 1
        }
      }
    ]);

    if (!comment[0]) {
      res.status(404).send({ message: "Comment not found" });
      return;
    }

    res.status(200).send(comment[0]);
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
