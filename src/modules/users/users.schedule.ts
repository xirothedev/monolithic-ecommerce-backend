import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserStatusService } from './services/users-status.service';

@Injectable()
export class UsersSchedule {
  private readonly logger = new Logger(UsersSchedule.name);

  constructor(private readonly usersStatusService: UserStatusService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSyncLastActive() {
    this.logger.log('Starting sync of lastActiveAt for online users');
    await this.usersStatusService.syncOnlineUsersLastActive();
  }
}
