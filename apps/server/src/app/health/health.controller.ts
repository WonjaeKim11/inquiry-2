import { Controller, Get } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { RedisService } from '@inquiry/server-redis';

/** 헬스 체크 응답 */
interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services: {
    database: { status: string };
    redis: { status: string };
  };
}

/**
 * 헬스 체크 컨트롤러.
 * GET /api/health로 DB + Redis 상태를 확인한다.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly redis: RedisService
  ) {}

  @Get()
  async check(): Promise<HealthCheckResponse> {
    const dbStatus = await this.checkDatabase();
    const redisStatus = this.checkRedis();

    const allOk =
      dbStatus === 'up' && (redisStatus === 'up' || redisStatus === 'disabled');
    const hasError = dbStatus === 'down';

    return {
      status: hasError ? 'error' : allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: dbStatus },
        redis: { status: redisStatus },
      },
    };
  }

  /** DB 연결 상태 확인 */
  private async checkDatabase(): Promise<string> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  /** Redis 연결 상태 확인 */
  private checkRedis(): string {
    if (!this.redis.getClient()) return 'disabled';
    return this.redis.isConnected ? 'up' : 'down';
  }
}
