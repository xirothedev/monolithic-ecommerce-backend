import { Body, Controller, Get, Put, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { Request } from 'express';
import { ImageInterceptor } from '@/common/interceptors/image.interceptor';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put('avatar')
  @UseInterceptors(ImageInterceptor('avatar'))
  @ApiOperation({ summary: 'Change user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Avatar updated successfully' })
  changeUserAvatar(@Req() req: Request, @UploadedFile() avatar: Express.Multer.File) {
    return this.usersService.updateUserAvatar(req, avatar);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get user settings' })
  @ApiResponse({ status: 200, description: 'Settings fetched successfully' })
  getUserSettings(@Req() req: Request) {
    return this.usersService.getUserSettings(req);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update user settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  updateUserSettings(@Req() req: Request, @Body() body: UpdateUserSettingsDto) {
    return this.usersService.updateUserSettings(req, body);
  }
}
