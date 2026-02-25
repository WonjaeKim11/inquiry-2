import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LicenseService } from '@inquiry/server-license';

/**
 * Enterprise 라이선스 검증 가드.
 * contacts feature flag가 활성화되어 있는지 확인한다.
 * Fallback: CONTACTS_ENABLED 환경변수로 제어 가능.
 */
@Injectable()
export class EnterpriseLicenseGuard implements CanActivate {
  constructor(
    private readonly licenseService: LicenseService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 환경변수 fallback 확인
    const envEnabled = this.configService.get<string>('CONTACTS_ENABLED');
    if (envEnabled === 'true') {
      return true;
    }

    const hasFeature = await this.licenseService.hasFeature('contacts');
    if (!hasFeature) {
      throw new ForbiddenException(
        '연락처 관리 기능은 Enterprise 라이선스가 필요합니다.'
      );
    }

    return true;
  }
}
