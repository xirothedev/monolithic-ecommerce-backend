import { Module } from '@nestjs/common';
import { CartService } from '../cart/cart.service';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserStatusService } from './services/users-status.service';
import { UsersGateway } from './users.gateway';

@Module({
  controllers: [UsersController],
  providers: [UsersResolver, UsersService, CartService, UserStatusService, UsersGateway],
  exports: [UserStatusService, UsersService],
})
export class UsersModule {}
