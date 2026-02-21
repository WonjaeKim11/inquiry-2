import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ServerAuthService } from './server-auth.service';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { CustomThrottlerGuard } from '@inquiry/server-rate-limit';
import {
  SignupRateLimit,
  LoginRateLimit,
  EmailVerifyRateLimit,
  PasswordResetRateLimit,
} from '@inquiry/server-rate-limit';

/** Refresh token 쿠키 설정을 위한 상수 */
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7일

/** Request에서 클라이언트 IP를 추출 */
function getIpAddress(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || 'unknown';
}

/**
 * 인증 관련 API 엔드포인트 컨트롤러.
 * 회원가입, 로그인, OAuth, 토큰 갱신, 로그아웃, 이메일 검증, 비밀번호 재설정을 처리한다.
 */
@Controller('auth')
export class ServerAuthController {
  constructor(
    private readonly authService: ServerAuthService,
    private readonly configService: ConfigService
  ) {}

  /**
   * POST /api/auth/signup — 이메일+비밀번호 회원가입.
   * 회원가입 성공 시 토큰을 발급하지 않고 이메일 검증을 요구한다.
   */
  @UseGuards(CustomThrottlerGuard)
  @SignupRateLimit()
  @Post('signup')
  async signup(@Body() dto: SignupDto, @Req() req: Request) {
    const ipAddress = getIpAddress(req);
    return this.authService.signup(dto, ipAddress);
  }

  /** POST /api/auth/login — 이메일+비밀번호 로그인 */
  @UseGuards(CustomThrottlerGuard)
  @LoginRateLimit()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as { id: string; email: string };
    const ipAddress = getIpAddress(req);
    const tokens = await this.authService.login(user, ipAddress);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  /** POST /api/auth/verify-email — 이메일 검증 */
  @UseGuards(CustomThrottlerGuard)
  @EmailVerifyRateLimit()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    const ipAddress = getIpAddress(req);
    return this.authService.verifyEmail(dto.token, ipAddress);
  }

  /** POST /api/auth/forgot-password — 비밀번호 재설정 요청 */
  @UseGuards(CustomThrottlerGuard)
  @PasswordResetRateLimit()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const ipAddress = getIpAddress(req);
    return this.authService.forgotPassword(dto.email, ipAddress);
  }

  /** POST /api/auth/reset-password — 비밀번호 재설정 실행 */
  @UseGuards(CustomThrottlerGuard)
  @PasswordResetRateLimit()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const ipAddress = getIpAddress(req);
    return this.authService.resetPassword(dto.token, dto.password, ipAddress);
  }

  /** POST /api/auth/refresh — Access Token 갱신 */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const oldToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!oldToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: '리프레시 토큰이 없습니다.',
      });
    }
    const tokens = await this.authService.refreshTokens(oldToken);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  /** POST /api/auth/logout — 로그아웃 */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (token) {
      await this.authService.logout(token);
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE);
    return { message: '로그아웃 되었습니다.' };
  }

  /** GET /api/auth/google — Google OAuth 시작 */
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {
    // Guard가 Google 로그인 페이지로 리다이렉트
  }

  /** GET /api/auth/google/callback — Google OAuth 콜백 */
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; email: string };
    const tokens = await this.authService.login(user);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    const clientUrl = this.configService.getOrThrow<string>('CLIENT_URL');
    res.redirect(
      `${clientUrl}/auth/callback?accessToken=${tokens.accessToken}`
    );
  }

  /** GET /api/auth/github — GitHub OAuth 시작 */
  @UseGuards(GithubAuthGuard)
  @Get('github')
  githubLogin() {
    // Guard가 GitHub 로그인 페이지로 리다이렉트
  }

  /** GET /api/auth/github/callback — GitHub OAuth 콜백 */
  @UseGuards(GithubAuthGuard)
  @Get('github/callback')
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; email: string };
    const tokens = await this.authService.login(user);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    const clientUrl = this.configService.getOrThrow<string>('CLIENT_URL');
    res.redirect(
      `${clientUrl}/auth/callback?accessToken=${tokens.accessToken}`
    );
  }

  /** GET /api/auth/me — 현재 인증된 사용자 정보 */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: Record<string, unknown>) {
    return user;
  }

  /** Refresh token을 HTTP-only 쿠키에 설정 */
  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: '/',
    });
  }
}
