import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersScheduler } from './orders.scheduler';
import { PdfGeneratorService } from './pdf-generator.service';
import { PaymentModule } from '@/modules/payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersScheduler, PdfGeneratorService],
})
export class OrdersModule {}
