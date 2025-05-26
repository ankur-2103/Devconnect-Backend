import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from "../models";
import { IUser } from '../models/user.model';
import { IRole } from '../models/role.model';

const User = db.user;
const Role = db.role;

interface DecodedToken {
  id: string;
  username: string;
  email: string;
  roles: string[];
}

interface AuthRequest extends Request {
  user?: DecodedToken;
}

const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers["x-access-token"] as string;
    if (!token) {
      res.status(403).json({ message: "No token provided!" });
      return;
    }

    const secret = process.env.SECERET;
    if (!secret) {
      res.status(500).json({ message: "Server configuration error" });
      return;
    }

    const decoded = jwt.verify(token, secret) as DecodedToken;

    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      roles: decoded.roles,
    };

    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized!" });
  }
};

const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const roles = await Role.find({ _id: { $in: user.roles } });
    if (roles.some(role => role.name === "admin")) {
      next();
      return;
    }

    res.status(403).json({ message: "Require Admin Role!" });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'An error occurred' });
  }
};

const isModerator = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const roles = await Role.find({ _id: { $in: user.roles } });
    if (roles.some(role => role.name === "moderator" || role.name === "admin")) {
      next();
      return;
    }

    res.status(403).json({ message: "Require Moderator Role!" });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'An error occurred' });
  }
};

const authJwt = {
  verifyToken,
  isAdmin,
  isModerator,
};

export default authJwt; 