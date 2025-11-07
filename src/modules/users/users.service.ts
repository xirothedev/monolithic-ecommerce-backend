import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseService } from '@/supabase/supabase.service';
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/generated';
import { Request } from 'express';
import { UpdateUserByAdmin } from './dto/update-user-by-admin-input.dto';
import { UpdateUserInput } from './dto/update-user-input.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // Resolver
  async findUser(id: string) {
    try {
      const user = await this.prismaService.user.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          fullname: true,
          email: true,
          phone: true,
          avatarUrl: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          biography: true,
          roles: true,
          flags: true,
          credit: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch {
      throw new NotFoundException('User not found');
    }
  }

  async updateUser(id: string, input: UpdateUserInput) {
    try {
      const user = await this.prismaService.user.update({ where: { id }, data: input });

      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found.`);
      }
      throw error;
    }
  }

  async updateUserByAdmin(id: string, input: UpdateUserByAdmin) {
    try {
      const uniqueRoles = [...new Set(input.roles)];
      const uniqueFlags = [...new Set(input.flags)];
      const user = await this.prismaService.user.update({
        where: { id },
        data: {
          roles: { set: uniqueRoles },
          flags: { set: uniqueFlags },
        },
      });

      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found.`);
      }
      throw error;
    }
  }

  // Controller
  async updateUserAvatar(req: Request, avatar: Express.Multer.File) {
    const user = req.user;

    const { error, path } = await this.supabaseService.uploadFile(avatar, {
      contentType: avatar.mimetype,
    });

    if (error) {
      throw new InternalServerErrorException(`Failed to upload file: ${avatar.originalname}`);
    }

    if (user.avatarUrl) {
      try {
        await this.supabaseService.deleteFile(user.avatarUrl);
      } catch {
        throw new InternalServerErrorException('Failed to delete old image');
      }
    }

    const data = await this.prismaService.user.update({
      where: { id: user.id },
      data: { avatarUrl: path },
    });

    return {
      message: 'Updated user avatar successful',
      data,
    };
  }

  async getUserSettings(req: Request) {
    const user = req.user;
    const data = await this.prismaService.setting.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
      },
      update: {},
      select: {
        emailNotifications: true,
        browserNotifications: true,
        ticketNotifications: true,
        suggestedProducts: true,
        promotionNotifications: true,
        priceChangesNotifications: true,
        loginNotifications: true,
        restockNotifications: true,
      },
    });

    return {
      message: 'Fetched user settings successful',
      data,
    };
  }

  async updateUserSettings(req: Request, body: UpdateUserSettingsDto) {
    const user = req.user;

    const data = await this.prismaService.setting.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...body,
      },
      update: body,
    });

    return {
      message: 'Updated user settings successful',
      data,
    };
  }
}
