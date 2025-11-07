import { User } from '@prisma/generated';

interface SafeUser extends Omit<User, 'hashedPassword'> {}
