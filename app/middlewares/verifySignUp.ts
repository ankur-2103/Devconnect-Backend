import { Request, Response, NextFunction } from 'express';
import db from "../models";
import { Auth } from '../models/auth.model';

const Role = db.role;

const checkDuplicateUsernameOrEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usernameExists = await Auth.findOne({ username: req.body.username });
    if (usernameExists) {
      res.status(400).json({ message: "Failed! Username is already in use!" });
      return;
    }

    const emailExists = await Auth.findOne({ email: req.body.email });
    if (emailExists) {
      res.status(400).json({ message: "Failed! Email is already in use!" });
      return;
    }

    next();
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'An error occurred' });
  }
};

const checkRolesExisted = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.body.roles) {
    for (const role of req.body.roles) {
      const roleExists = await Role.findOne({ enum: role.enum });
      if (!roleExists) {
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