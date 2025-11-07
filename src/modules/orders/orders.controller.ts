import { Roles } from '@/common/decorators/roles.decorator';
import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindAllOrdersDto } from './dto/find-all-orders.dto';
import { OrdersService } from './orders.service';
import { CreateOrderFromCartDto } from './dto/create-order-from-cart.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid order data' })
  @ApiResponse({ status: 404, description: 'Product or product item not found' })
  @ApiBody({ type: CreateOrderDto })
  create(@Req() req: Request, @Body() body: CreateOrderDto) {
    return this.ordersService.create(req, body);
  }

  @Post('from-cart')
  @ApiOperation({ summary: 'Create order from user cart' })
  @ApiResponse({ status: 201, description: 'Order created from cart successfully' })
  @ApiResponse({ status: 400, description: 'Cart is empty or invalid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentMethod: { type: 'string', enum: ['MOMO', 'VIETQR_PAYOS'] },
        note: { type: 'string' },
      },
    },
  })
  createFromCart(@Req() req: Request, @Body() body: CreateOrderFromCartDto) {
    return this.ordersService.createFromCart(req, body);
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: 200, description: 'List of user orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['DONE', 'PENDING', 'REFUNDED', 'CANCELLED', 'FAILED'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Req() req: Request, @Query() query: FindAllOrdersDto) {
    return this.ordersService.findAll(req, query);
  }

  @Get('seller')
  @Roles('SELLER')
  @ApiOperation({ summary: 'Get orders for seller products' })
  @ApiResponse({ status: 200, description: 'List of orders for seller products' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['DONE', 'PENDING', 'REFUNDED', 'CANCELLED', 'FAILED'] })
  findSellerOrders(@Req() req: Request, @Query() query: FindAllOrdersDto) {
    return this.ordersService.findSellerOrders(req, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.ordersService.findOne(req, id);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Get order items details' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Order items with product details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getOrderItems(@Req() req: Request, @Param('id') id: string) {
    return this.ordersService.getOrderItems(req, id);
  }

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Download order invoice as PDF' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    description: 'Invoice PDF file',
    headers: {
      'Content-Type': { description: 'application/pdf' },
      'Content-Disposition': { description: 'attachment; filename="invoice-{orderId}.pdf"' },
    },
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async downloadInvoice(@Req() req: Request, @Param('id') id: string, @Res() res: Response) {
    const invoice = await this.ordersService.generateInvoice(req, id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');

    return res.send(invoice);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  cancel(@Req() req: Request, @Param('id') id: string) {
    return this.ordersService.cancel(req, id);
  }

  @Patch(':id/refund')
  @Roles('ADMINISTRATOR')
  @ApiOperation({ summary: 'Refund an order' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Order refunded successfully' })
  @ApiResponse({ status: 400, description: 'Order cannot be refunded' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  refund(@Param('id') id: string) {
    return this.ordersService.refund(id);
  }

  @Post('cleanup-expired')
  @Roles('ADMINISTRATOR')
  @ApiOperation({ summary: 'Manually trigger cleanup of expired orders' })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  async manualCleanup() {
    await this.ordersService.manualCleanupExpiredOrders();
    return { message: 'Cleanup completed successfully' };
  }

  @Get('expired/count')
  @Roles('ADMINISTRATOR')
  @ApiOperation({ summary: 'Get count of expired orders' })
  @ApiResponse({ status: 200, description: 'Count of expired orders' })
  async getExpiredCount() {
    return this.ordersService.getExpiredOrdersCount();
  }
}
