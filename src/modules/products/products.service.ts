import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseService } from '@/supabase/supabase.service';
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/generated';
import { Request } from 'express';
import { CreateProductDto } from './dto/create-product.dto';
import { FindAllProductDto } from './dto/find-all-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  public async create(req: Request, body: CreateProductDto, medias: Express.Multer.File[]) {
    const seller = req.user;

    const uploadPromises = medias.map((media) =>
      this.supabaseService.uploadFile(media, {
        contentType: media.mimetype,
      }),
    );

    const uploadResults = await Promise.all(uploadPromises);
    const failedUploads = uploadResults.filter((result) => result.error);

    if (failedUploads.length > 0) {
      throw new InternalServerErrorException(`Failed to upload ${failedUploads.length} files`);
    }

    const urls = uploadResults.map((result) => result.path);

    try {
      const createdProduct = await this.prismaService.$transaction(async (tx) => {
        return tx.product.create({
          data: {
            slug: body.slug,
            name: body.name,
            description: body.description,
            flags: body.flags,
            originalPrice: body.originalPrice,
            discountPrice: body.discountPrice ?? body.originalPrice,
            categoryId: body.categoryId,
            stock: body.productItems.length,
            tags: body.tags,
            sellerId: seller.id,
            medias: urls,
            productItems: {
              createMany: { data: body.productItems, skipDuplicates: false },
            },
          },
          select: {
            productItems: true,
            category: true,
          },
        });
      });

      return {
        message: 'Create product successful',
        data: createdProduct,
      };
    } catch (error) {
      await Promise.allSettled(urls.map((url) => this.supabaseService.deleteFile(url)));

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('Slug is exist');
      }

      throw error;
    }
  }

  public async update(req: Request, productId: string, body: UpdateProductDto, medias: Express.Multer.File[]) {
    const seller = req.user;

    // Check if product exists and belongs to the seller
    const existingProduct = await this.prismaService.product.findFirst({
      where: {
        id: productId,
        sellerId: seller.id,
      },
      select: {
        productItems: true,
        medias: true,
      },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found or you do not have permission to update it');
    }

    const updateData: Prisma.ProductUpdateInput = {};

    updateData.medias = await this.handleProductMedias({
      oldMedias: existingProduct.medias || [],
      mediasKeep: body.mediasKeep,
      newFiles: medias,
      supabaseService: this.supabaseService,
    });

    // Update basic product fields if provided
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.flags !== undefined) updateData.flags = body.flags;
    if (body.originalPrice !== undefined) updateData.originalPrice = body.originalPrice;
    if (body.discountPrice !== undefined) {
      updateData.discountPrice = body.discountPrice;
    } else if (body.originalPrice !== undefined) {
      updateData.discountPrice = body.originalPrice;
    }
    if (body.categoryId !== undefined) {
      updateData.category = {
        connect: { id: body.categoryId },
      };
    }
    if (body.tags !== undefined) updateData.tags = body.tags;

    // Handle product items update if provided
    if (body.productItems !== undefined) {
      // Delete existing product items that are not sold
      await this.prismaService.productItem.deleteMany({
        where: {
          productId: productId,
          isSold: false,
        },
      });

      // Create new product items
      updateData.productItems = {
        createMany: { data: body.productItems, skipDuplicates: false },
      };
      updateData.stock = body.productItems.length;
    }

    try {
      const updatedProduct = await this.prismaService.product.update({
        where: {
          id: productId,
        },
        data: updateData,
        include: {
          category: true,
        },
      });

      return {
        message: 'Update product successful',
        data: updatedProduct,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Slug already exists');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Product not found');
        }
      }

      // Unknown error fallback
      throw error;
    }
  }

  public async findById(productId: string) {
    const product = await this.getProductById(productId);
    return {
      message: 'Get product successful',
      data: product,
    };
  }

  public async findBySeller(sellerId: string) {
    const products = await this.prismaService.product.findMany({
      where: { sellerId },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Get seller products successful',
      data: products,
    };
  }

  public async findAll(query: FindAllProductDto) {
    const { page, limit, cursor, categoryId, minPrice, maxPrice, search } = query;
    const take = limit ?? 20;
    let skip: number | undefined = undefined;
    let cursorObj: Prisma.ProductWhereUniqueInput | undefined = undefined;

    if (cursor) {
      cursorObj = { id: cursor };
      skip = 1; // skip the cursor itself
    } else if (page && page > 1) {
      skip = (page - 1) * take;
    }

    // Build Prisma where clause for filtering
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      stock: {
        gt: 0,
      },
    };
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }
    // Build discountPrice filter
    if (typeof minPrice === 'number' && typeof maxPrice === 'number') {
      where.discountPrice = { gte: minPrice, lte: maxPrice };
    } else if (typeof minPrice === 'number') {
      where.discountPrice = { gte: minPrice };
    } else if (typeof maxPrice === 'number') {
      where.discountPrice = { lte: maxPrice };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await this.prismaService.product.findMany({
      where,
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            fullname: true,
          },
        },
      },
      orderBy: [{ sold: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      skip,
      ...(cursorObj && { cursor: cursorObj }),
    });

    const productsWithAvgRating = await Promise.all(
      products.map(async (product) => {
        const avg = await this.prismaService.review.aggregate({
          where: {
            productId: product.id,
          },
          _avg: {
            rating: true,
          },
        });

        return {
          ...product,
          averageRating: avg._avg.rating?.toFixed(1) ?? null,
        };
      }),
    );

    const totalItems = await this.prismaService.product.count({ where });

    let nextCursor: string | null = null;
    let hasNextPage = false;
    let result = productsWithAvgRating;
    if (products.length > take) {
      hasNextPage = true;
      const nextItem = productsWithAvgRating[take];
      nextCursor = nextItem?.id ?? null;
      result = productsWithAvgRating.slice(0, take);
    }

    return {
      message: 'Get all products successful',
      data: result,
      '@data': {
        totalItems,
        nextCursor,
        hasNextPage,
      },
    };
  }

  public async delete(req: Request, productId: string) {
    const seller = req.user;

    // Check if product exists and belongs to the seller
    const existingProduct = await this.prismaService.product.findFirst({
      where: {
        id: productId,
        sellerId: seller.id,
      },
      select: { id: true },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found or you do not have permission to delete it');
    }

    try {
      await this.prismaService.product.delete({
        where: { id: productId },
      });

      return {
        message: 'Delete product successful',
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Product not found');
        }
      }

      throw error;
    }
  }

  // public handler
  public async getProductById(productId: string) {
    try {
      const product = await this.prismaService.product.findUniqueOrThrow({
        where: { id: productId },
        select: undefined,
      });

      const avgResult = await this.prismaService.review.aggregate({
        where: { productId },
        _avg: { rating: true },
      });

      return {
        ...product,
        averageRating: avgResult._avg.rating?.toFixed(1) ?? 0,
      };
    } catch {
      throw new NotFoundException('Product not found');
    }
  }

  // private helper
  private async handleProductMedias({
    oldMedias,
    mediasKeep,
    newFiles,
    supabaseService,
  }: {
    oldMedias: string[];
    mediasKeep?: string[];
    newFiles: Express.Multer.File[];
    supabaseService: SupabaseService;
  }): Promise<string[]> {
    // 1. keep medias
    const keepMedias = Array.isArray(mediasKeep) ? mediasKeep : oldMedias || [];

    // 2. Delete old medias
    const mediasToDelete = (oldMedias || []).filter((m) => !keepMedias.includes(m));
    for (const mediaPath of mediasToDelete) {
      await supabaseService.deleteFile(mediaPath);
    }

    // 3. Upload new medias
    const uploadedMedias: string[] = [];
    if (newFiles && newFiles.length > 0) {
      for (const media of newFiles) {
        const { error, path } = await supabaseService.uploadFile(media, {
          contentType: media.mimetype,
        });
        if (error) {
          throw new InternalServerErrorException(`Failed to upload file: ${media.originalname}`);
        }
        uploadedMedias.push(path);
      }
    }

    // 4. return medias array
    return [...keepMedias, ...uploadedMedias];
  }
}
