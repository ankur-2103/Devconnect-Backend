import { Request, Response } from 'express';
import db from "../models";
import { IUser } from '../models/user.model';
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Types } from 'mongoose';
import { Auth } from '../models/auth.model';
import { RoleEnum } from '../enums/role.enum';

const User = db.user;

interface SignupRequest extends Request {
  body: {
    username: string;
    email: string;
    password: string;
    roles?: number[];  // Role enum values
  };
}

interface SigninRequest extends Request {
  body: {
    username: string;
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
      roles: req.body.roles || [RoleEnum.user.enum]  // Default to user role enum
    });

    await auth.save();

    // Create user profile with same _id as auth
    const user = new User({
      _id: auth._id,
      name: '',
      bio: '',
      skills: [],
      social: {
        github: '',
        linkedin: '',
        twitter: '',
        website: ''
      },
      avatar: ''
    });

    await user.save();
    res.status(201).send({ message: "User registered successfully!" });

  } catch (err) {
    res.status(500).send({ message: err instanceof Error ? err.message : 'An error occurred' });
  }
};

const signin = async (req: SigninRequest, res: Response): Promise<void> => {
  try {
    const auth = await Auth.findOne({ username: req.body.username });

    if (!auth) {
      res.status(404).send({ message: "User Not Found." });
      return;
    }

    const passwordIsValid = bcrypt.compareSync(req.body.password, auth.password);
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
        roles: auth.roles  // Already contains role enum values
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
    res.status(500).send({ message: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export default {
  signup,
  signin
}; 