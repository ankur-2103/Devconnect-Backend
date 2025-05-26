import mongoose from 'mongoose';
import { User } from './user.model';
import { Role } from './role.model';
import { Auth } from './auth.model';

interface IDatabase {
  mongoose: typeof mongoose;
  user: typeof User;
  role: typeof Role;
  auth: typeof Auth;
}

const db: IDatabase = {
  mongoose,
  user: User,
  role: Role,
  auth: Auth,
};

export default db; 