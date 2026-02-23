import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ServerPrismaService } from '@inquiry/server-prisma';

/** JWT Access Token payload 타입 */
interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * JWT Access Token 검증 전략.
 * Authorization: Bearer <token> 헤더에서 토큰을 추출하여 사용자를 식별한다.
 * isActive 확인을 통해 비활성 계정의 토큰 사용을 차단한다.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: ServerPrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        emailVerified: true,
        isActive: true,
        locale: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      locale: user.locale,
    };
  }
}
