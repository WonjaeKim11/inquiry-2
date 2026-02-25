import { Module } from '@nestjs/common';

/**
 * Contact 관리 모듈.
 * 연락처 CRUD, CSV Import, 속성 관리, 개인화 링크 기능을 제공한다.
 * ServerPrismaModule, AuditLogModule, LicenseModule은 @Global()이므로 별도 import 불필요.
 */
@Module({
  controllers: [],
  providers: [],
  exports: [],
})
export class ContactModule {}
