import { User } from '@prisma/generated';
import { Request, Response } from 'express';

export interface GqlContext {
  req: Request & { user: Omit<User, 'hashedPassword'> };
  res: Response;
}
