import { Controller, Post, Get, Body, UseGuards, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ServerAuthService } from './server-auth.service';
import { SignupDto } from './dto/signup.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

/** Refresh token 쿠키 설정을 위한 상수 */
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7일

/**
 * 인증 관련 API 엔드포인트 컨트롤러.
 * 회원가입, 로그인, OAuth, 토큰 갱신, 로그아웃을 처리한다.
 */
@Controller('auth')
export class ServerAuthController {
  constructor(private readonly authService: ServerAuthService, private readonly configService: ConfigService) {}

  /** POST /api/auth/signup — 이메일+비밀번호 회원가입 */
  @Post('signup')
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.signup(dto);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  /** POST /api/auth/login — 이메일+비밀번호 로그인 */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as { id: string; email: string };
    const tokens = await this.authService.login(user);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  /** POST /api/auth/refresh — Access Token 갱신 */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
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
    // 클라이언트로 리다이렉트하면서 accessToken을 쿼리 파라미터로 전달
    const clientUrl = this.configService.getOrThrow<string>('CLIENT_URL');
    res.redirect(`${clientUrl}/auth/callback?accessToken=${tokens.accessToken}`);
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
    res.redirect(`${clientUrl}/auth/callback?accessToken=${tokens.accessToken}`);
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
