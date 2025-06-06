import { Request, Response } from "express";
import { User } from "../models/user.model";
import { AuthUser } from "../models/auth.model";
import { Types } from "mongoose";
import { PaginatedResponse } from "../models/common.model";
import { SearchUser } from "../models/user.model";
import supabase from "../../supabase";

const userMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.metadata!.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const authUser: AuthUser = {
      _id: user._id.toString(),
      name: user.name,
      bio: user.bio,
      skills: user.skills,
      social: {
        github: user.social.github,
        linkedin: user.social.linkedin,
        twitter: user.social.twitter,
        website: user.social.website,
      },
      avatar: user.avatar,
      roles: req.metadata?.roles || [],
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    res.status(200).json(authUser);
  } catch (err) {
    res.status(500).json({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.metadata!.id;
    const formData = req.body;
    console.log("🚀 ~ updateMe ~ formData:", formData);
    const file = req.file;
    console.log("🚀 ~ updateMe ~ file:", file);

    let avatarUrl = formData.avatar;

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

      avatarUrl = publicUrl.publicUrl;
    }

    const updateData = {
      name: formData.name,
      bio: formData.bio,
      skills: formData.skills,
      social: {
        github: formData.social?.github,
        linkedin: formData.social?.linkedin,
        twitter: formData.social?.twitter,
        website: formData.social?.website,
      },
      avatar: avatarUrl,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const response = {
      _id: user._id,
      name: user.name,
      bio: user.bio,
      skills: user.skills,
      social: {
        github: user.social.github,
        linkedin: user.social.linkedin,
        twitter: user.social.twitter,
        website: user.social.website,
      },
      avatar: user.avatar,
      roles: req.metadata?.roles || [],
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body._id;
    const formData = req.body;
    const file = formData.file;

    let avatarUrl = formData.avatar;

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

      avatarUrl = publicUrl.publicUrl;
    }

    const updateData = {
      name: formData.name,
      bio: formData.bio,
      skills: formData.skills,
      social: {
        github: formData.social?.github,
        linkedin: formData.social?.linkedin,
        twitter: formData.social?.twitter,
        website: formData.social?.website,
      },
      avatar: avatarUrl,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const response = {
      _id: user._id,
      name: user.name,
      bio: user.bio,
      skills: user.skills,
      social: {
        github: user.social.github,
        linkedin: user.social.linkedin,
        twitter: user.social.twitter,
        website: user.social.website,
      },
      avatar: user.avatar,
      roles: req.metadata?.roles || [],
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.metadata?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const page = parseInt(req.params.page || "1");
    const limit = parseInt(req.params.limit || "10");
    const skip = (page - 1) * limit;
    const searchQuery = req.params.search || "";

    // Create search conditions
    const searchConditions = {
      _id: { $ne: new Types.ObjectId((req.metadata.id as string) || "") }, // Exclude current user
      name: { $ne: "" }, // Exclude users with empty names
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { bio: { $regex: searchQuery, $options: "i" } },
        { skills: { $regex: searchQuery, $options: "i" } },
      ],
    };

    const [users, total] = await Promise.all([
      User.find(searchConditions)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(searchConditions),
    ]);

    const hasMore = skip + users.length < total;

    const response: PaginatedResponse<SearchUser> = {
      items: users.map((user) => ({
        _id: user._id.toString(),
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasMore,
      },
    };

    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const authUser: AuthUser = {
      _id: user._id.toString(),
      name: user.name,
      bio: user.bio,
      skills: user.skills,
      social: {
        github: user.social.github,
        linkedin: user.social.linkedin,
        twitter: user.social.twitter,
        website: user.social.website,
      },
      avatar: user.avatar,
      roles: [], //x We don't include roles in public profile
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    res.status(200).json(authUser);
  } catch (err) {
    res.status(500).json({
      message: err instanceof Error ? err.message : "An error occurred",
    });
  }
};

export default {
  userMe,
  updateMe,
  updateUser,
  searchUsers,
  getUserById,
};
