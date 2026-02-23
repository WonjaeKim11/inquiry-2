import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InviteController } from './invite.controller.js';
import { InviteService } from './invite.service.js';

/**
 * 초대 모듈.
 * 초대 생성/목록/재발송/삭제/수락 엔드포인트를 제공한다.
 * AuditLogModule, ServerPrismaModule, ConfigModule, EmailModule, RbacModule은
 * @Global()이므로 별도 import 불필요.
 */
@Module({
  imports: [JwtModule.register({})],
  controllers: [InviteController],
  providers: [InviteService],
  exports: [InviteService],
})
export class InviteModule {}
