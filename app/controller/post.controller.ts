import { Request, Response } from "express";
import { Post, IPost } from "../models/post.model";
import { Types } from "mongoose";
import { RoleEnum } from "../enums/role.enum";
import {
  PaginatedResponse as SharedPaginatedResponse,
  DecodedToken,
} from "../models/common.model";

interface PostRequest extends Request {
  metadata?: DecodedToken;
  body: {
    content: string;
    docUri?: string;
  };
  query: {
    page?: string;
    limit?: string;
  };
}

// Create a new post
const createPost = async (req: PostRequest, res: Response): Promise<void> => {
  try {
    const post = new Post({
      userId: new Types.ObjectId(req.metadata?.id),
      content: req.body.content,
      docUri: req.body.docUri || "",
    });

    await post.save();
    const populatedPost = await Post.findById(post._id).populate({
      path: "userId",
      select: "name avatar",
      model: "User",
    });
    res.status(201).send(populatedPost);
  } catch (err) {
    res
      .status(500)
      .send({
        message: err instanceof Error ? err.message : "An error occurred",
      });
  }
};

// Get all posts
const getAllPosts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "userId",
        select: "name avatar",
        model: "User",
      });
    res.status(200).send(posts);
  } catch (err) {
    res
      .status(500)
      .send({
        message: err instanceof Error ? err.message : "An error occurred",
      });
  }
};

// Get post by ID
const getPostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id).populate({
      path: "userId",
      select: "name avatar",
      model: "User",
    });
    if (!post) {
      res.status(404).send({ message: "Post not found" });
      return;
    }
    res.status(200).send(post);
  } catch (err) {
    res
      .status(500)
      .send({
        message: err instanceof Error ? err.message : "An error occurred",
      });
  }
};

// Update post
const updatePost = async (req: PostRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).send({ message: "Post not found" });
      return;
    }

    // Check if user owns the post or is admin
    const isAdmin = req.metadata?.roles.includes(RoleEnum.admin.enum);
    if (post.userId.toString() !== req.metadata?.id && !isAdmin) {
      res.status(403).send({ message: "Not authorized to update this post" });
      return;
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { 
        content: req.body.content,
        docUri: req.body.docUri || post.docUri,
      },
      { new: true }
    ).populate({
      path: "userId",
      select: "name avatar",
      model: "User",
    });
    res.status(200).send(updatedPost);
  } catch (err) {
    res
      .status(500)
      .send({
        message: err instanceof Error ? err.message : "An error occurred",
      });
  }
};

// Delete post
const deletePost = async (req: PostRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).send({ message: "Post not found" });
      return;
    }

    // Check if user owns the post or is admin
    const isAdmin = req.metadata?.roles.includes(RoleEnum.admin.enum);
    if (post.userId.toString() !== req.metadata?.id && !isAdmin) {
      res.status(403).send({ message: "Not authorized to delete this post" });
      return;
    }

    await Post.findByIdAndDelete(req.params.id);
    res.status(200).send({ message: "Post deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .send({
        message: err instanceof Error ? err.message : "An error occurred",
      });
  }
};

// Like/Unlike post
const toggleLike = async (req: PostRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).send({ message: "Post not found" });
      return;
    }

    const userId = new Types.ObjectId(req.metadata?.id);
    const likeIndex = post.likes.indexOf(userId);

    if (likeIndex === -1) {
      // Like the post
      post.likes.push(userId);
    } else {
      // Unlike the post
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    const updatedPost = await Post.findById(post._id).populate({
      path: "userId",
      select: "name avatar",
      model: "User",
    });
    res.status(200).send(updatedPost);
  } catch (err) {
    res
      .status(500)
      .send({
        message: err instanceof Error ? err.message : "An error occurred",
      });
  }
};

// Get user posts with pagination
const getUserPosts = async (req: PostRequest, res: Response): Promise<void> => {
  try {
    if (!req.metadata?.id) {
      res.status(401).send({ message: "Unauthorized" });
      return;
    }

    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const skip = (page - 1) * limit;

    // Use userId from params if available, otherwise use authenticated user's id
    const userId = new Types.ObjectId(req.params.userId || req.metadata.id);

    const [posts, total] = await Promise.all([
      Post.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "userId",
          select: "name avatar",
          model: "User",
        })
        .lean(),
      Post.countDocuments({ userId }),
    ]);

    const hasMore = skip + posts.length < total;

    const response: SharedPaginatedResponse<IPost> = {
      items: posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasMore,
      },
    };

    res.status(200).send(response);
  } catch (err) {
    res
      .status(500)
      .send({
        message: err instanceof Error ? err.message : "An error occurred",
      });
  }
};

// Get feed (latest posts from other users)
const getFeed = async (req: PostRequest, res: Response): Promise<void> => {
  try {
    if (!req.metadata?.id) {
      res.status(401).send({ message: "Unauthorized" });
      return;
    }

    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const skip = (page - 1) * limit;

    const userId = new Types.ObjectId(req.metadata.id);
    
    const [posts, total] = await Promise.all([
      Post.find({ userId: { $ne: userId } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "userId",
          select: "name avatar",
          model: "User",
        })
        .lean(),
      Post.countDocuments({ userId: { $ne: userId } }),
    ]);

    const hasMore = skip + posts.length < total;

    const response: SharedPaginatedResponse<IPost> = {
      items: posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasMore,
      },
    };

    res.status(200).send(response);
  } catch (err) {
    console.error("Error in getFeed:", err);
    res
      .status(500)
      .send({
        message: err instanceof Error ? err.message : "An error occurred",
      });
  }
};

export default {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  getUserPosts,
  getFeed,
};
