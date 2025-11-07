import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  IsBooleanString,
} from 'class-validator';

@ValidatorConstraint({ name: 'ContentOrAttachments', async: false })
export class ContentOrAttachmentsConstraint implements ValidatorConstraintInterface {
  validate(content: any, args: ValidationArguments): boolean {
    const obj = args.object as CreateTicketMessageDto;
    // Either content exists (and is not empty) or attachments exist
    const hasContent = content && typeof content === 'string' && content.trim().length > 0;
    const hasAttachments = obj.hasAttachments;
    return hasContent || hasAttachments || false;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Either content or attachments must be provided';
  }
}

export class CreateTicketMessageDto {
  @ApiProperty({
    example: 'I need help with my order',
    description: 'Message content (optional if attachments are provided)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Validate(ContentOrAttachmentsConstraint)
  content?: string;

  @ApiProperty({
    description: 'Flag indicating if attachments are present (set automatically)',
    required: false,
  })
  @IsBooleanString()
  @IsOptional()
  hasAttachments?: boolean | string;
}
