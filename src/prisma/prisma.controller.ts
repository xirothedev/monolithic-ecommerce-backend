import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Public } from '@/common/decorators/public.decorator';

@Controller('prisma')
export class PrismaController {
  constructor(private readonly prismaService: PrismaService) {}

  @Post('seed')
  @Public()
  @HttpCode(HttpStatus.OK)
  async seed() {
    await this.prismaService.seed();
    return { message: 'Database seeded successfully' };
  }
}
