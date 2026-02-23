import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServerPrismaModule } from '@inquiry/server-prisma';
import { RedisModule } from '@inquiry/server-redis';
import { LoggerModule } from '@inquiry/server-logger';
import { SentryModule } from '@inquiry/server-sentry';
import { LicenseModule } from '@inquiry/server-license';
import { CryptoModule } from '@inquiry/server-crypto';
import { ServerAuthModule } from '@inquiry/server-auth';
import { RateLimitModule } from '@inquiry/server-rate-limit';
import { EmailModule } from '@inquiry/server-email';
import { AuditLogModule } from '@inquiry/server-audit-log';
import { UserModule } from '@inquiry/server-user';
import { OrganizationModule } from '@inquiry/server-organization';
import { RbacModule } from '@inquiry/server-rbac';
import { InviteModule } from '@inquiry/server-invite';
import { MemberModule } from '@inquiry/server-member';
import { ProjectModule } from '@inquiry/server-project';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * 루트 애플리케이션 모듈.
 * libs에서 제공하는 모듈들을 import하여 조합한다.
 * @Global() 모듈: ServerPrismaModule, RedisModule, LoggerModule, SentryModule,
 *   LicenseModule, CryptoModule, EmailModule, AuditLogModule, RbacModule
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServerPrismaModule,
    RedisModule,
    LoggerModule,
    SentryModule,
    LicenseModule,
    CryptoModule,
    RateLimitModule,
    EmailModule,
    AuditLogModule,
    ServerAuthModule,
    UserModule,
    OrganizationModule,
    RbacModule,
    InviteModule,
    MemberModule,
    ProjectModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
