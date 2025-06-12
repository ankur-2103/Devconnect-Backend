import { Request, Response } from "express";
import { User } from "../models/user.model";
import { Post } from "../models/post.model";
import { Comment } from "../models/comment.model";
import { Auth } from "../models/auth.model";
import { RoleEnum } from "../enums/role.enum";

interface AdminDashboardRequest extends Request {
  metadata?: {
    id: string;
    roles: number[];
  };
}

// Helper to generate aggregation pipeline for historical data
const generateHistoricalPipeline = (dateField: string) => [
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` },
      },
      count: { $sum: 1 },
    },
  },
  {
    $sort: { _id: 1 as const },
  },
  {
    $project: {
      date: "$_id",
      count: 1,
      _id: 0,
    },
  },
];

// Helper to get role distribution
// controllers/adminDashboard.controller.ts
const getRoleDistribution = async () => {
  const roleDistribution = await Auth.aggregate([
    // Lookup to populate roles from Role collection
    {
      $lookup: {
        from: "roles",          // collection name in MongoDB (plural usually)
        localField: "roles",    // field in Auth schema (assuming ObjectId array)
        foreignField: "enum",    // field in Role schema
        as: "roleDetails",
      },
    },
    { $unwind: "$roleDetails" }, // Flatten array of populated roles
    {
      $group: {
        count: { $sum: 1 },
        _id: "$roleDetails.name", // Group by role name
      },
    },
    {
      $project: {
        count: 1,
        role: "$_id",
        _id: 0,
      },
    },
  ]);

  return roleDistribution;
};



const getDashboardStats = async (
  req: AdminDashboardRequest,
  res: Response
): Promise<void> => {
  try {
    // Verify admin role
    if (!req.metadata?.roles.includes(RoleEnum.admin.enum)) {
      res.status(403).json({ message: "Require Admin Role!" });
      return;
    }

    // Get total counts
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalComments = await Comment.countDocuments();

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    const newPosts = await Post.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    const newComments = await Comment.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // // Get user role distribution
    // const roleDistribution = await Auth.aggregate([
    //   {
    //     $unwind: "$roles",
    //   },
    //   {
    //     $group: {
    //       _id: "$roles",
    //       count: { $sum: 1 },
    //     },
    //   },
    // ]);

    // Get recent posts with user information
    const recentPosts = await Post.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          content: 1,
          docUri: 1,
          likes: 1,
          createdAt: 1,
          updatedAt: 1,
          "user._id": 1,
          "user.name": 1,
          "user.avatar": 1,
        },
      },
    ]);

    // Get most liked posts
    const mostLikedPosts = await Post.aggregate([
      {
        $addFields: {
          likesCount: { $size: "$likes" },
        },
      },
      { $sort: { likesCount: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          content: 1,
          docUri: 1,
          likes: 1,
          likesCount: 1,
          createdAt: 1,
          updatedAt: 1,
          "user._id": 1,
          "user.name": 1,
          "user.avatar": 1,
        },
      },
    ]);

    // Get most commented posts
    const mostCommentedPosts = await Post.aggregate([
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
      { $sort: { commentsCount: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          content: 1,
          docUri: 1,
          likes: 1,
          commentsCount: 1,
          createdAt: 1,
          updatedAt: 1,
          "user._id": 1,
          "user.name": 1,
          "user.avatar": 1,
        },
      },
    ]);

    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name avatar bio createdAt")
      .lean();

    res.status(200).json({
      overview: {
        totalUsers,
        totalPosts,
        totalComments,
        newUsers,
        newPosts,
        newComments,
      },
      // roleDistribution: roleDistribution.map((role) => ({
      //   role:
      //     role._id === RoleEnum.user.enum
      //       ? "User"
      //       : role._id === RoleEnum.moderator.enum
      //       ? "Moderator"
      //       : "Admin",
      //   count: role.count,
      // })),
      recentActivity: {
        posts: recentPosts,
        users: recentUsers,
        mostLikedPosts,
        mostCommentedPosts,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

const getHistoricalData = async (req: AdminDashboardRequest, res: Response) => {
  try {
    const [usersOverTime, postsOverTime, commentsOverTime, roleDistribution] =
      await Promise.all([
        User.aggregate(generateHistoricalPipeline("createdAt")),
        Post.aggregate(generateHistoricalPipeline("createdAt")),
        Comment.aggregate(generateHistoricalPipeline("createdAt")),
        getRoleDistribution(),
      ]);

    res.json({
      usersOverTime,
      postsOverTime,
      commentsOverTime,
      roleDistribution,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching historical data" });
  }
};

export default {
  getDashboardStats,
  getHistoricalData,
};
