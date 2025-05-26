import { Request, Response } from 'express';

interface AuthRequest extends Request {
  user?: {
    username: string;
  };
}

const userBoard = (req: AuthRequest, res: Response): void => {
  res.status(200).json({
    message: "Welcome to the User Dashboard!",
    user: req.user ? req.user.username : "Guest",
    access: "Registered users only",
    timestamp: new Date().toISOString()
  });
};

export default {
  userBoard,
}; 