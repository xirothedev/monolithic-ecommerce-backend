import { Public } from '@/common/decorators/public.decorator';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WebhookDto } from './dto/webook.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Handle payment webhook from PayOS' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  webhook(@Body() body: WebhookDto) {
    return this.paymentService.handlePaymentWebhook(body);
  }

  @Get('status/:orderId')
  @ApiOperation({ summary: 'Get payment status for an order' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiResponse({ status: 200, description: 'Payment status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentStatus(orderId);
  }
}
