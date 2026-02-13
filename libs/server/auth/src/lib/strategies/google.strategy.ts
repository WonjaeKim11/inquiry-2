import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ServerAuthService } from '../server-auth.service';

/** Google OAuth에서 전달되는 프로필 정보 */
interface GoogleProfile {
  id: string;
  emails: { value: string }[];
  displayName: string;
  photos: { value: string }[];
}

/**
 * Google OAuth 2.0 인증 전략.
 * Google 로그인 후 콜백에서 사용자를 생성/조회한다.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService, private readonly authService: ServerAuthService) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: '/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: GoogleProfile, done: VerifyCallback) {
    const user = await this.authService.validateOAuthUser({
      provider: 'google',
      providerAccountId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      image: profile.photos[0]?.value,
      accessToken,
      refreshToken,
    });
    done(null, user);
  }
}
