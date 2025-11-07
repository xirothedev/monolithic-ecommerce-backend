import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  public async withCount() {
    const categories = await this.prismaService.category.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { products: true },
        },
      },
    });

    const filtered = categories.filter((cat) => cat._count.products > 0);
    const formatted = filtered.map((cat) => ({
      id: cat.id,
      name: cat.name,
      count: cat._count.products,
    }));

    return {
      message: 'Get categories successful',
      data: formatted,
    };
  }

  public async getCategoryById(id: string) {
    try {
      const category = await this.prismaService.category.findUniqueOrThrow({
        where: { id },
        select: undefined,
      });

      return category;
    } catch {
      throw new NotFoundException('Category not found');
    }
  }
}
