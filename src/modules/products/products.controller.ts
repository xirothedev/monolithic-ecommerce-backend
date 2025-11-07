import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { MediasInterceptor } from '@/common/interceptors/media.interceptor';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateProductDto } from './dto/create-product.dto';
import { FindAllProductDto } from './dto/find-all-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles('SELLER')
  @UseInterceptors(MediasInterceptor('medias'))
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiBody({ type: CreateProductDto })
  create(@Req() req: Request, @Body() body: CreateProductDto, @UploadedFiles() medias: Express.Multer.File[]) {
    return this.productsService.create(req, body, medias);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'List of all products' })
  findAll(@Query() query: FindAllProductDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get('seller/:sellerId')
  @ApiOperation({ summary: 'Get all products by seller' })
  @ApiParam({ name: 'sellerId', type: String })
  @ApiResponse({ status: 200, description: 'List of products' })
  findBySeller(@Param('sellerId') sellerId: string) {
    return this.productsService.findBySeller(sellerId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Product detail' })
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Public()
  @Put(':id')
  @Roles('SELLER')
  @UseInterceptors(MediasInterceptor('medias'))
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @UploadedFiles() medias: Express.Multer.File[],
  ) {
    return this.productsService.update(req, id, body, medias);
  }

  @Delete(':id')
  @Roles('SELLER')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  delete(@Req() req: Request, @Param('id') id: string) {
    return this.productsService.delete(req, id);
  }
}
