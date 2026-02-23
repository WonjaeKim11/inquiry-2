import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

/**
 * 사용자 모듈.
 * 사용자 프로필 관리(로케일 변경 등) 엔드포인트를 제공한다.
 * AuditLogModule, ServerPrismaModule은 @Global()이므로 별도 import 불필요.
 */
@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
