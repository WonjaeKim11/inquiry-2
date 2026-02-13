import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ServerAuthService } from '../server-auth.service';

/** GitHub OAuth에서 전달되는 프로필 정보 */
interface GithubProfile {
  id: string;
  emails: { value: string }[];
  displayName: string;
  photos: { value: string }[];
}

/**
 * GitHub OAuth 인증 전략.
 * GitHub 로그인 후 콜백에서 사용자를 생성/조회한다.
 */
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService, private readonly authService: ServerAuthService) {
    super({
      clientID: configService.getOrThrow<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: '/api/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GithubProfile,
    done: (err: Error | null, user?: Record<string, unknown>) => void
  ) {
    const user = await this.authService.validateOAuthUser({
      provider: 'github',
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
