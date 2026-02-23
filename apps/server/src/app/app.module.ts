import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServerPrismaModule } from '@inquiry/server-prisma';
import { RedisModule } from '@inquiry/server-redis';
import { LoggerModule } from '@inquiry/server-logger';
import { SentryModule } from '@inquiry/server-sentry';
import { LicenseModule } from '@inquiry/server-license';
import { ServerAuthModule } from '@inquiry/server-auth';
import { RateLimitModule } from '@inquiry/server-rate-limit';
import { EmailModule } from '@inquiry/server-email';
import { AuditLogModule } from '@inquiry/server-audit-log';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * 루트 애플리케이션 모듈.
 * libs에서 제공하는 모듈들을 import하여 조합한다.
 * @Global() 모듈: ServerPrismaModule, RedisModule, LoggerModule, SentryModule,
 *   LicenseModule, EmailModule, AuditLogModule
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServerPrismaModule,
    RedisModule,
    LoggerModule,
    SentryModule,
    LicenseModule,
    RateLimitModule,
    EmailModule,
    AuditLogModule,
    ServerAuthModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
