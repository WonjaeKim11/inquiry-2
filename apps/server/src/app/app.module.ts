import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RouterModule } from '@nestjs/core';
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
import { SurveyModule } from '@inquiry/server-survey';
import { QuotaModule } from '@inquiry/server-quota';
import { ApiKeyModule } from '@inquiry/server-api-key';
import { ClientApiModule } from '@inquiry/server-client-api';
import { ManagementApiModule } from '@inquiry/server-management-api';
import { HealthModule } from './health/health.module';
import { V2HealthModule } from './v2-health/v2-health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * 루트 애플리케이션 모듈.
 * libs에서 제공하는 모듈들을 import하여 조합한다.
 * @Global() 모듈: ServerPrismaModule, RedisModule, LoggerModule, SentryModule,
 *   LicenseModule, CryptoModule, EmailModule, AuditLogModule, RbacModule
 *
 * API 라우팅:
 * - /api/v1/client/:environmentId/... → ClientApiModule (인증 불필요)
 * - /api/v1/management/... → ManagementApiModule (API Key 인증)
 * - /api/v2/health → V2HealthModule (v2 스텁)
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
    SurveyModule,
    QuotaModule,
    ApiKeyModule,
    ClientApiModule,
    ManagementApiModule,
    V2HealthModule,
    HealthModule,
    // API 버전 라우팅: Client API와 Management API를 v1 경로에 마운트
    RouterModule.register([
      { path: 'v1/client', module: ClientApiModule },
      { path: 'v1/management', module: ManagementApiModule },
      { path: 'v2', module: V2HealthModule },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
