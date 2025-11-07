import { Cookies } from '@/common/decorators/cookie.decorator';
import { Public } from '@/common/decorators/public.decorator';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { MfaStatus } from './auth.interface';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { MfaVerificationDto, RequestMfaCodeDto } from './dto/mfa-verification.dto';
import { SetupMfaDto, ToggleMfaDto, VerifyMfaSetupDto } from './dto/setup-mfa.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MfaService } from './services/mfa.service';
import { DiscordAuthGuard } from './guards/discord.guard';
import { GoogleAuthGuard } from './guards/google.guard';
import { AuthSocialService } from './services/auth-social.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
    private readonly authSocialService: AuthSocialService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: CreateAuthDto })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response, @Cookies('session_id') sessionId: string) {
    return this.authService.login(body, res, sessionId);
  }

  @Post('verify-email')
  @Public()
  @ApiOperation({ summary: 'Request email verification' })
  @ApiBody({ schema: { properties: { email: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  verifyEmail(@Body('email') email: string) {
    return this.authService.verifyEmail(email);
  }

  @Get('verify-email')
  @Public()
  @ApiOperation({ summary: 'Confirm email verification' })
  @ApiQuery({ name: 'token', type: String, required: false })
  @ApiResponse({ status: 200, description: 'Email verified' })
  confirmVerifyEmail(@Query() query: VerifyEmailDto) {
    return this.authService.confirmVerifyEmail(query);
  }

  @Post('refresh-token')
  @Public()
  @ApiOperation({ summary: 'Refresh JWT token' })
  @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  refreshToken(
    @Cookies('refresh_token') tokenFromCookie: string,
    @Body('refreshToken') tokenFromBody: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refreshToken(tokenFromCookie, tokenFromBody, req, res);
  }

  // MFA Setup endpoints
  @Post('mfa/setup')
  @ApiOperation({ summary: 'Setup MFA' })
  @ApiBody({ type: SetupMfaDto })
  @ApiResponse({ status: 200, description: 'MFA setup initiated' })
  setupMfa(@Req() req: Request, @Body() body: SetupMfaDto) {
    return this.mfaService.setupMfa(req, body);
  }

  @Post('mfa/verify-setup')
  @ApiOperation({ summary: 'Verify MFA setup' })
  @ApiBody({ type: VerifyMfaSetupDto })
  @ApiResponse({ status: 200, description: 'MFA setup verified' })
  verifyMfaSetup(@Req() req: Request, @Body() body: VerifyMfaSetupDto) {
    return this.mfaService.verifyMfaSetup(req.user.id, body);
  }

  @Post('mfa/:status')
  @ApiOperation({ summary: 'Toggle MFA status' })
  @ApiParam({ name: 'status', enum: MfaStatus })
  @ApiBody({ type: ToggleMfaDto })
  @ApiResponse({ status: 200, description: 'MFA status toggled' })
  disableMfa(
    @Req() req: Request,
    @Param('status', new ParseEnumPipe(MfaStatus)) status: MfaStatus,
    @Body() disableDto: ToggleMfaDto,
  ) {
    return this.mfaService.toggleMfa(req.user.id, status, disableDto);
  }

  // MFA Verification endpoints
  @Post('mfa/verify/:id')
  @Public()
  @ApiOperation({ summary: 'Verify MFA code' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: MfaVerificationDto })
  @ApiResponse({ status: 200, description: 'MFA verified' })
  verifyMfa(@Param('id') userId: string, @Body() body: MfaVerificationDto) {
    // Note: This endpoint should be used after initial login when MFA is required
    // The userId should be passed in the request body or extracted from a temporary session
    if (!userId) {
      throw new BadRequestException('Missing params');
    }
    return this.mfaService.verifyMfa(userId, body);
  }

  @Post('mfa/request-code')
  @Public()
  @ApiOperation({ summary: 'Request MFA code' })
  @ApiBody({ type: RequestMfaCodeDto })
  @ApiResponse({ status: 200, description: 'MFA code sent' })
  requestMfaCode(@Body() body: RequestMfaCodeDto) {
    // Note: This endpoint should be used after initial login when MFA is required
    // The userId should be passed in the request body or extracted from a temporary session
    return this.mfaService.requestMfaCode(body);
  }

  // MFA Status and Management
  @Get('mfa/status')
  @ApiOperation({ summary: 'Get MFA status' })
  @ApiResponse({ status: 200, description: 'MFA status returned' })
  getMfaStatus(@Req() req: Request) {
    return this.mfaService.getMfaStatus(req.user.id);
  }

  @Post('mfa/regenerate-backup-codes')
  @ApiOperation({ summary: 'Regenerate MFA backup codes' })
  @ApiResponse({ status: 200, description: 'Backup codes regenerated' })
  regenerateBackupCodes(@Req() req: Request) {
    return this.mfaService.regenerateBackupCodes(req.user.id);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid current password or same password' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Current password is incorrect' })
  @ApiResponse({ status: 404, description: 'User not found' })
  changePassword(@Req() req: Request, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, body);
  }

  @Post('logout')
  @Public()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  logout(
    @Cookies('refresh_token') refreshToken: string,
    @Cookies('session_id') sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(refreshToken, sessionId, res);
  }

  @ApiOperation({
    summary: 'Initiate Google OAuth login',
    description: 'Redirects user to Google for OAuth authentication. This endpoint starts the Google OAuth flow.',
    tags: ['Social Authentication'],
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth authorization page',
  })
  @Get('google/login')
  @UseGuards(GoogleAuthGuard)
  @Public()
  googleLogin() {
    return;
  }

  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Handles the callback from Google OAuth after successful authentication. Creates or logs in user and sets authentication cookies.',
    tags: ['Social Authentication'],
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful, user logged in with cookies set',
  })
  @ApiResponse({
    status: 401,
    description: 'Google authentication failed',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during authentication process',
  })
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @Public()
  googleCallback(@Req() req, @Res({ passthrough: false }) res: Response) {
    return this.authSocialService.handleGoogleCallback(req.user, res);
  }

  @ApiOperation({
    summary: 'Initiate Discord OAuth login',
    description: 'Redirects user to Discord for OAuth authentication. This endpoint starts the Discord OAuth flow.',
    tags: ['Social Authentication'],
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Discord OAuth authorization page',
  })
  @Get('discord/login')
  @Public()
  @UseGuards(DiscordAuthGuard)
  discordLogin() {
    return;
  }

  @ApiOperation({
    summary: 'Discord OAuth callback',
    description:
      'Handles the callback from Discord OAuth after successful authentication. Creates or logs in user and sets authentication cookies.',
    tags: ['Social Authentication'],
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful, user logged in with cookies set',
  })
  @ApiResponse({
    status: 401,
    description: 'Discord authentication failed',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during authentication process',
  })
  @Public()
  @Get('discord/callback')
  @UseGuards(DiscordAuthGuard)
  discordCallback(@Req() req, @Res({ passthrough: false }) res: Response) {
    return this.authSocialService.handleDiscordCallback(req.user, res);
  }
}
