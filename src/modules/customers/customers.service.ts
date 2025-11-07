import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class CustomersService {
  createContact(_body: CreateContactDto) {
    return { message: 'Send successful' };
  }
}
