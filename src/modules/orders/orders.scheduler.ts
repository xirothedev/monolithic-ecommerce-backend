import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { BillStatus } from '@prisma/generated';

@Injectable()
export class OrdersScheduler {
  private readonly logger = new Logger(OrdersScheduler.name);

  constructor(private readonly prismaService: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredOrders() {
    await this.performCleanup();
  }

  async performCleanup() {
    const cleanupThresholdMinutes = 15;
    const fifteenMinutesAgo = new Date(Date.now() - cleanupThresholdMinutes * 60 * 1000);

    try {
      const expiredOrders = await this.prismaService.order.findMany({
        where: {
          createdAt: {
            lt: fifteenMinutesAgo,
          },
          bill: {
            status: BillStatus.PENDING,
          },
        },
        include: {
          bill: true,
          items: true,
        },
      });

      if (expiredOrders.length === 0) {
        return;
      }

      this.logger.log(
        `Found ${expiredOrders.length} expired orders to cleanup (older than ${cleanupThresholdMinutes} minutes)`,
      );

      for (const order of expiredOrders) {
        try {
          await this.prismaService.$transaction(async (tx) => {
            await tx.orderItem.deleteMany({
              where: {
                orderId: order.id,
              },
            });

            await tx.order.delete({
              where: {
                id: order.id,
              },
            });

            await tx.bill.delete({
              where: {
                id: order.billId,
              },
            });
          });

          this.logger.log(`Successfully deleted expired order: ${order.id} and bill: ${order.billId}`);
        } catch (orderError) {
          this.logger.error(`Failed to delete expired order ${order.id}:`, orderError);
        }
      }
    } catch (error) {
      this.logger.error('Error in performCleanup:', error);
    }
  }
}
