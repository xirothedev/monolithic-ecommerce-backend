import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';

@Injectable()
export class RedisUserService {
  constructor(private readonly redisService: RedisService) {}

  async getUserOnline(userId: string) {
    const online = await this.redisService.get(`user:online:${userId}`);
    return online ? JSON.parse(online) : null;
  }

  async setUserOnline(userId: string) {
    await this.redisService.getOrSet(`user:online:${userId}`, () => true, 60 * 10);
  }

  async setUserOffline(userId: string) {
    await this.redisService.deleteKey(`user:online:${userId}`);
  }

  async getUserOnlineList() {
    const keys = await this.redisService.getClient().keys('user:online:*');
    return keys.map((key) => key.split(':')[2]);
  }
}
