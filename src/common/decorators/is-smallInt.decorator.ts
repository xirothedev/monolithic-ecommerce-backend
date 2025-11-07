import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isSmallInt', async: false })
export class IsSmallIntConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments) {
    if (typeof value !== 'number' || !Number.isInteger(value)) return false;
    return value >= -32768 && value <= 32767;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid SMALLINT between -32,768 and 32,767`;
  }
}

export function IsSmallInt(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSmallInt',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsSmallIntConstraint,
    });
  };
}
