import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditLogService } from '@inquiry/server-audit-log';
import { isValidLocale } from '@inquiry/shared-i18n';

/**
 * 사용자 서비스.
 * 사용자 정보 조회/수정 기능을 제공한다.
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly auditLogService: AuditLogService
  ) {}

  /**
   * 사용자의 로케일(선호 언어)을 업데이트한다.
   * @param userId - 사용자 ID
   * @param locale - 새 로케일 코드 (BCP 47 형식)
   * @param ipAddress - 요청자 IP 주소
   */
  async updateLocale(
    userId: string,
    locale: string,
    ipAddress?: string
  ): Promise<{ locale: string }> {
    if (!isValidLocale(locale)) {
      throw new BadRequestException('지원하지 않는 로케일입니다.');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { locale },
      select: { locale: true },
    });

    // 감사 로그 기록
    this.auditLogService.logEvent({
      action: 'user.locale-changed',
      userId,
      targetType: 'user',
      targetId: userId,
      ipAddress,
      metadata: { locale },
    });

    this.logger.debug(`사용자 ${userId} 로케일 변경: ${locale}`);

    return { locale: user.locale || locale };
  }
}
