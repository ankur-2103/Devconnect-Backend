import { Request, Response } from "express";
import { Post, IPost } from "../models/post.model";
import { Types } from "mongoose";
import { RoleEnum } from "../enums/role.enum";
import supabase from "../../supabase";
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
    sortBy?: string;
  };
  file?: Express.Multer.File;
}

// Create a new post
const createPost = async (req: PostRequest, res: Response): Promise<void> => {
  try {
    const formData = req.body;
    const file = req.file;
    let docUri = formData.docUri || "";

    // If there's a file in the form data, upload it to Supabase
    if (file) {
      const fileName = `${Date.now()}-${file.originalname}`;
      const bucket = process.env.SUPABASE_BUCKET as string;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      docUri = publicUrl.publicUrl;
    }

    const post = new Post({
      userId: new Types.ObjectId(req.metadata?.id),
      content: formData.content,
      docUri,
    });

    await post.save();

    const populatedPost = await Post.aggregate([
      {
        $match: {
          _id: post._id,
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          as: "comments",
        },
      },
      {
        $addFields: {
          commentsCount: { $size: "$comments" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 1,
          content: 1,
          docUri: 1,
          likes: 1,
          createdAt: 1,
          updatedAt: 1,
          commentsCount: 1,
          "user._id": 1,
          "user.name": 1,
          "user.avatar": 1,
        },
      },
    ]);

    res.status(201).send(populatedPost[0]);
  } catch (err) {
    res.status(500).send({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

// Get all posts
const getAllPosts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const posts = await Post.aggregate([
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          as: "comments",
        },
      },
      {
        $addFields: {
          commentsCount: { $size: "$comments" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 1,
          content: 1,
          docUri: 1,
          likes: 1,
          createdAt: 1,
          updatedAt: 1,
          commentsCount: 1,
          "user._id": 1,
          "user.name": 1,
          "user.avatar": 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    res.status(200).send(posts);
  } catch (err) {
    res.status(500).send({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

// Get post by ID
const getPostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await Post.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(req.params.id),
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          as: "comments",
        },
      },
      {
        $addFields: {
          commentsCount: { $size: "$comments" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 1,
          content: 1,
          docUri: 1,
          likes: 1,
          createdAt: 1,
          updatedAt: 1,
          commentsCount: 1,
          "user._id": 1,
          "user.name": 1,
          "user.avatar": 1,
        },
      },
    ]);

    if (!post[0]) {
      res.status(404).send({ message: "Post not found" });
      return;
    }

    res.status(200).send(post[0]);
  } catch (err) {
    res.status(500).send({
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

    const formData = req.body;
    const file = req.file;
    let docUri = formData.docUri || post.docUri;

    // If there's a file in the form data, upload it to Supabase
    if (file) {
      const fileName = `${Date.now()}-${file.originalname}`;
      const bucket = process.env.SUPABASE_BUCKET as string;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      docUri = publicUrl.publicUrl;
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      {
        content: formData.content,
        docUri,
      },
      { new: true }
    );

    if (!updatedPost) {
      res.status(404).send({ message: "Post not found" });
      return;
    }

    const populatedPost = await Post.aggregate([
      {
        $match: {
          _id: updatedPost._id,
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          as: "comments",
        },
      },
      {
        $addFields: {
          commentsCount: { $size: "$comments" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 1,
          content: 1,
          docUri: 1,
          likes: 1,
          createdAt: 1,
          updatedAt: 1,
          commentsCount: 1,
          "user._id": 1,
          "user.name": 1,
          "user.avatar": 1,
        },
      },
    ]);

    res.status(200).send(populatedPost[0]);
  } catch (err) {
    res.status(500).send({
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
    res.status(500).send({
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

    const updatedPost = await Post.aggregate([
      {
        $match: {
          _id: post._id,
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          as: "comments",
        },
      },
      {
        $addFields: {
          commentsCount: { $size: "$comments" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 1,
          content: 1,
          docUri: 1,
          likes: 1,
          createdAt: 1,
          updatedAt: 1,
          commentsCount: 1,
          "user._id": 1,
          "user.name": 1,
          "user.avatar": 1,
        },
      },
    ]);

    res.status(200).send(updatedPost[0]);
  } catch (err) {
    res.status(500).send({
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
      Post.aggregate([
        {
          $match: { userId },
        },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "postId",
            as: "comments",
          },
        },
        {
          $addFields: {
            commentsCount: { $size: "$comments" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            _id: 1,
            content: 1,
            docUri: 1,
            likes: 1,
            createdAt: 1,
            updatedAt: 1,
            commentsCount: 1,
            "user._id": 1,
            "user.name": 1,
            "user.avatar": 1,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
      ]),
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
    res.status(500).send({
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

    // Determine the sorting field dynamically
    let sortStage: Record<string, 1 | -1> = {};

    if (req.query.sortBy === "likes") {
      sortStage = { likes: -1 };
    } else if (req.query.sortBy === "comments") {
      sortStage = { commentsCount: -1 };
    } else if (req.query.sortBy === "recent") {
      sortStage = { createdAt: -1 };
    } else {
      // If no sortBy param, sort by: most recent, most likes, most comments
      sortStage = { createdAt: -1, likes: -1, commentsCount: -1 };
    }

    const userId = new Types.ObjectId(req.metadata.id);

    const [posts, total] = await Promise.all([
      Post.aggregate([
        {
          $match: { userId: { $ne: userId } },
        },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "postId",
            as: "comments",
          },
        },
        {
          $addFields: {
            commentsCount: { $size: "$comments" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            _id: 1,
            content: 1,
            docUri: 1,
            likes: 1,
            createdAt: 1,
            updatedAt: 1,
            commentsCount: 1,
            "user._id": 1,
            "user.name": 1,
            "user.avatar": 1,
          },
        },
        {
          $sort: sortStage,
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
      ]),
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
    res.status(500).send({
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
