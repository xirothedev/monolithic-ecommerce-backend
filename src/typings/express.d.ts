import 'express';
import { User } from '@prisma/generated';

declare module 'express' {
  export interface Request {
    user: Omit<User, 'hashedPassword'>;
  }
}
