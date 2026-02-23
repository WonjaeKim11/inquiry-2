import { Global, Module } from '@nestjs/common';
import { RbacGuard } from './guards/rbac.guard.js';

/**
 * RBAC 모듈.
 * RbacGuard를 글로벌로 제공하여 모든 모듈에서 사용 가능하게 한다.
 * ServerPrismaModule, ConfigModule은 @Global()이므로 별도 import 불필요.
 */
@Global()
@Module({
  providers: [RbacGuard],
  exports: [RbacGuard],
})
export class RbacModule {}
