import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from "../models";
import { Auth } from '../models/auth.model';
import { DecodedToken } from '../models/common.model';

const Role = db.role;

const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      res.status(403).json({ message: "No token provided!" });
      return;
    }

    // Check if the token is in the correct format
    if (!authHeader.startsWith('Bearer ')) {
      res.status(403).json({ message: "Invalid token format!" });
      return;
    }

    // Extract the token from the Bearer string
    const token = authHeader.split(' ')[1];

    const secret = process.env.SECERET;
    if (!secret) {
      res.status(500).json({ message: "Server configuration error" });
      return;
    }

    const decoded = jwt.verify(token, secret) as DecodedToken;

    req.metadata = {
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

const isAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.metadata?.id) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await Auth.findById(req.metadata.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const roles = await Role.find({ enum: { $in: user.roles } });
    if (roles.some(role => role.name === "admin")) {
      next();
      return;
    }

    res.status(403).json({ message: "Require Admin Role!" });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'An error occurred' });
  }
};

const isModerator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.metadata?.id) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await Auth.findById(req.metadata.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const roles = await Role.find({ enum: { $in: user.roles } });
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