import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServerPrismaModule } from '@inquiry/server-prisma';
import { ServerAuthModule } from '@inquiry/server-auth';
import { RateLimitModule } from '@inquiry/server-rate-limit';
import { EmailModule } from '@inquiry/server-email';
import { AuditLogModule } from '@inquiry/server-audit-log';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * 루트 애플리케이션 모듈.
 * libs에서 제공하는 모듈들을 import하여 조합한다.
 * EmailModule, AuditLogModule은 @Global()이므로 한 번만 import하면 전체에서 사용 가능.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServerPrismaModule,
    RateLimitModule,
    EmailModule,
    AuditLogModule,
    ServerAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
