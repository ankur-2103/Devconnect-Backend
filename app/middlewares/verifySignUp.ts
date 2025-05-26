import { Request, Response, NextFunction } from 'express';
import db from "../models";
import { IUser } from '../models/user.model';

const ROLES = db.ROLES;
const User = db.user;

const checkDuplicateUsernameOrEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usernameExists = await User.findOne({ username: req.body.username });
    if (usernameExists) {
      res.status(400).json({ message: "Failed! Username is already in use!" });
      return;
    }

    const emailExists = await User.findOne({ email: req.body.email });
    if (emailExists) {
      res.status(400).json({ message: "Failed! Email is already in use!" });
      return;
    }

    next();
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'An error occurred' });
  }
};

const checkRolesExisted = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body.roles) {
    for (const role of req.body.roles) {
      if (!ROLES.includes(role)) {
        res.status(400).json({ message: `Failed! Role ${role} does not exist!` });
        return;
      }
    }
  }
  next();
};

const verifySignUp = {
  checkDuplicateUsernameOrEmail,
  checkRolesExisted
};

export default verifySignUp; 