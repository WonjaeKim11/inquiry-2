import { Module } from '@nestjs/common';
import { TypeDetectorService } from './services/type-detector.service.js';
import { ContactAttributeService } from './services/contact-attribute.service.js';
import { ContactService } from './services/contact.service.js';
import { ContactAttributeController } from './controllers/contact-attribute.controller.js';
import { ContactController } from './controllers/contact.controller.js';
import { ContactAccessGuard } from './guards/contact-access.guard.js';
import { EnterpriseLicenseGuard } from './guards/enterprise-license.guard.js';

/**
 * Contact 관리 모듈.
 * 연락처 CRUD, CSV Import, 속성 관리, 개인화 링크 기능을 제공한다.
 * ServerPrismaModule, AuditLogModule, LicenseModule은 @Global()이므로 별도 import 불필요.
 */
@Module({
  controllers: [ContactAttributeController, ContactController],
  providers: [
    TypeDetectorService,
    ContactAttributeService,
    ContactService,
    ContactAccessGuard,
    EnterpriseLicenseGuard,
  ],
  exports: [TypeDetectorService, ContactAttributeService, ContactService],
})
export class ContactModule {}
