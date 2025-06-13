import { Request, Response } from "express";
import db from "../models";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Auth } from "../models/auth.model";
import { ResetToken } from "../models/resetToken.model";
import { RoleEnum } from "../enums/role.enum";
import { sendPasswordResetEmail } from "../services/email.service";

const User = db.user;

interface SignupRequest extends Request {
  body: {
    username: string;
    email: string;
    password: string;
    roles?: number[]; // Role enum values
  };
}

interface SigninRequest extends Request {
  body: {
    usernameOrEmail: string;
    password: string;
  };
}

interface TokenPayload {
  id: string;
  username: string;
  email: string;
  roles: number[];
}

const signup = async (req: SignupRequest, res: Response): Promise<void> => {
  try {
    const auth = new Auth({
      username: req.body.username,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 8),
      roles: req.body.roles || [RoleEnum.user.enum], // Default to user role enum
    });

    await auth.save();

    // Create user profile with same _id as auth
    const user = new User({
      _id: auth._id,
      name: "",
      bio: "",
      skills: "",
      social: {
        github: "",
        linkedin: "",
        twitter: "",
        website: "",
      },
      avatar: "",
    });

    await user.save();
    res.status(201).send({ message: "User registered successfully!" });
  } catch (err) {
    res
      .status(500)
      .send({
        message: err instanceof Error ? err.message : "An error occurred",
      });
  }
};

const signin = async (req: SigninRequest, res: Response): Promise<void> => {
  try {
    const auth = await Auth.findOne({
      $or: [
        { username: req.body.usernameOrEmail },
        { email: req.body.usernameOrEmail },
      ],
    });

    if (!auth) {
      res.status(404).send({ message: "User Not Found." });
      return;
    }

    const passwordIsValid = bcrypt.compareSync(
      req.body.password,
      auth.password
    );
    if (!passwordIsValid) {
      res.status(401).send({ accessToken: null, message: "Invalid Password!" });
      return;
    }

    const secret = process.env.SECERET;
    if (!secret) {
      res.status(500).send({ message: "Server configuration error" });
      return;
    }

    const token = jwt.sign(
      {
        id: auth.id,
        username: auth.username,
        email: auth.email,
        roles: auth.roles, // Already contains role enum values
      } as TokenPayload,
      secret,
      {
        algorithm: "HS256",
        allowInsecureKeySizes: true,
        expiresIn: 86400,
      }
    );

    res.status(200).send({
      accessToken: token,
    });
  } catch (err) {
    res
      .status(500)
      .send({
        message: err instanceof Error ? err.message : "An error occurred",
      });
  }
};

const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { usernameOrEmail } = req.body;

    // Find user by either username or email
    const auth = await Auth.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!auth) {
      res
        .status(404)
        .send({ message: "No account found with that username or email." });
      return;
    }

    const secret = process.env.SECERET;
    if (!secret) {
      res.status(500).send({ message: "Server configuration error" });
      return;
    }

    // Generate JWT token with 1 hour expiry
    const resetToken = jwt.sign(
      {
        id: auth.id,
        username: auth.username,
        email: auth.email,
        roles: auth.roles,
      } as TokenPayload,
      secret,
      {
        algorithm: "HS256",
        allowInsecureKeySizes: true,
        expiresIn: "1h",
      }
    );

    // Store token in database
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    await ResetToken.create({
      token: resetToken,
      userId: auth._id,
      expiresAt,
    });

    // Send reset email
    await sendPasswordResetEmail(auth.email, resetToken);

    res
      .status(200)
      .send({ message: "Password reset email sent successfully." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).send({
      message:
        err instanceof Error
          ? err.message
          : "An error occurred while processing your request",
    });
  }
};

const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    const secret = process.env.SECERET;

    if (!secret) {
      res.status(500).send({ message: "Server configuration error" });
      return;
    }

    // Find token in database
    const resetToken = await ResetToken.findOne({ token });
    if (!resetToken) {
      res.status(400).send({ message: "Invalid reset token." });
      return;
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      res.status(400).send({ message: "Password reset token has expired." });
      return;
    }

    // Check if token has been used
    if (resetToken.isUsed) {
      res
        .status(400)
        .send({ message: "This password reset link has already been used." });
      return;
    }

    // Find user
    const auth = await Auth.findById(resetToken.userId);
    if (!auth) {
      res.status(400).send({ message: "Invalid reset token." });
      return;
    }

    // Mark token as used
    resetToken.isUsed = true;
    await resetToken.save();

    // Update password
    auth.password = bcrypt.hashSync(newPassword, 8);
    await auth.save();

    res.status(200).send({ message: "Password has been reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).send({
      message:
        err instanceof Error
          ? err.message
          : "An error occurred while resetting your password",
    });
  }
};

const updateUserRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if requester is admin
    if (!req.metadata?.roles.includes(RoleEnum.admin.enum)) {
      res.status(403).send({ message: "Require Admin Role!" });
      return;
    }

    const { userId, roles } = req.body;

    // Validate roles
    if (!roles || roles.length === 0) {
      res.status(400).send({ message: "At least one role must be provided" });
      return;
    }

    const validRoles = Object.values(RoleEnum).map((role) => role.enum);
    const invalidRoles = roles.filter(
      (role: number) => !validRoles.includes(role as 101 | 102 | 103)
    );
    if (invalidRoles.length > 0) {
      res.status(400).send({ message: "Invalid role values provided" });
      return;
    }

    // Update user roles
    const auth = await Auth.findByIdAndUpdate(userId, { roles }, { new: true });

    if (!auth) {
      res.status(404).send({ message: "User not found" });
      return;
    }

    res.status(200).send({
      message: "User roles updated successfully",
      roles: auth.roles,
    });
  } catch (err) {
    res.status(500).send({
      message:
        err instanceof Error
          ? err.message
          : "An error occurred while updating roles",
    });
  }
};

export default {
  signup,
  signin,
  forgotPassword,
  resetPassword,
  updateUserRoles,
};
