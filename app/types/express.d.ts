import { DecodedToken } from '../middlewares/authJwt';

declare global {
  namespace Express {
    interface Request {
      metadata?: DecodedToken;
    }
  }
} 