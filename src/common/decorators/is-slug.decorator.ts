import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isSlug', async: false })
export class IsSlugConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments) {
    if (typeof value !== 'string') {
      return false;
    }
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `Field ${args.property} must be a slug. The slug must contain only lowercase letters, numbers, and hyphens..`;
  }
}

export function IsSlug(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSlug',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsSlugConstraint,
    });
  };
}
