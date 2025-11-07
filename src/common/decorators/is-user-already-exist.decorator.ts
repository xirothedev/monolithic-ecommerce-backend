// tes

import { PrismaService } from '@/prisma/prisma.service';
import {
  isUUID,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isUserAlreadyExist', async: true })
class IsUserAlreadyExistConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prismaService: PrismaService) {}

  async validate(value: string, _args?: ValidationArguments) {
    if (!isUUID(value)) return false;

    const hasUser = await this.prismaService.user.count({ where: { id: value } });

    if (hasUser) return true;
    return false;
  }

  defaultMessage(_args?: ValidationArguments) {
    return `User does not exist`;
  }
}

export function IsUserAlreadyExist(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsUserAlreadyExistConstraint,
    });
  };
}
