import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from "../models";
import { Auth } from '../models/auth.model';
import { DecodedToken } from '../models/common.model';
import { RoleEnum } from '../enums/role.enum';

const Role = db.role;

const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      res.status(403).json({ message: "No token provided!" });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(403).json({ message: "Invalid token format!" });
      return;
    }

    const token = authHeader.split(' ')[1];

    const secret = process.env.SECERET;
    if (!secret) {
      res.status(500).json({ message: "Server configuration error" });
      return;
    }

    const decoded = jwt.verify(token, secret) as DecodedToken;

    if (!decoded.roles || decoded.roles.length === 0) {
      res.status(403).json({ message: "User must have at least one role" });
      return;
    }

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

// Helper function to check user roles
const checkUserRoles = async (userId: string, requiredRoles: number[]): Promise<boolean> => {
  try {
    const user = await Auth.findById(userId);
    if (!user) return false;

    // Check if user has any of the required roles
    return user.roles.some(role => requiredRoles.includes(role));
  } catch (err) {
    console.error('Error checking user roles:', err);
    return false;
  }
};

const isAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.metadata?.id) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const hasAdminRole = await checkUserRoles(req.metadata.id, [RoleEnum.admin.enum]);
    if (hasAdminRole) {
      next();
      return;
    }

    res.status(403).json({ message: "Require Admin Role!" });
  } catch (err) {
    console.error('Admin role check error:', err);
    res.status(500).json({ message: err instanceof Error ? err.message : 'An error occurred' });
  }
};

const isModerator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.metadata?.id) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const hasModeratorRole = await checkUserRoles(req.metadata.id, [RoleEnum.moderator.enum, RoleEnum.admin.enum]);
    if (hasModeratorRole) {
      next();
      return;
    }

    res.status(403).json({ message: "Require Moderator Role!" });
  } catch (err) {
    console.error('Moderator role check error:', err);
    res.status(500).json({ message: err instanceof Error ? err.message : 'An error occurred' });
  }
};

const authJwt = {
  verifyToken,
  isAdmin,
  isModerator,
};

export default authJwt; 