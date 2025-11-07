import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsEnum, IsOptional, Max, Min } from 'class-validator';
import { UserFlag, UserRole } from '@prisma/generated';
import { UserQL } from '../entities/user.entity';

export const AssignableUserRole = {
  SUPPORTER: UserRole.SUPPORTER,
  COLLABORATOR: UserRole.COLLABORATOR,
  SELLER: UserRole.SELLER,
  USER: UserRole.USER,
} as const;
export type AssignableUserRole = (typeof AssignableUserRole)[keyof typeof AssignableUserRole];

@InputType()
export class UpdateUserByAdmin implements Partial<UserQL> {
  @Field(() => [UserRole], { nullable: true })
  @IsEnum(AssignableUserRole, { each: true })
  @IsArray()
  @IsOptional()
  roles?: AssignableUserRole[];

  @Field(() => [UserFlag], { nullable: true })
  @IsEnum(UserFlag, { each: true })
  @IsArray()
  @IsOptional()
  flags?: UserFlag[];

  @Field({ nullable: true })
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  @IsOptional()
  credit?: number;
}
