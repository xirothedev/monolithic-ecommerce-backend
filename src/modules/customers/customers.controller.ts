import { Body, Controller, Post } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer contact/feedback' })
  @ApiBody({ type: CreateContactDto })
  createContact(@Body() body: CreateContactDto) {
    return this.customersService.createContact(body);
  }
}
