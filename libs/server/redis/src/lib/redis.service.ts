import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis 서비스.
 * REDIS_URL 환경변수가 설정되지 않으면 no-op으로 동작한다.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL이 설정되지 않았습니다. Redis 기능이 비활성화됩니다.'
      );
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 200, 2000),
      });
      this.client.on('error', (err) =>
        this.logger.error('Redis 연결 오류', err)
      );
      this.logger.log('Redis 연결 완료');
    } catch (error) {
      this.logger.error('Redis 초기화 실패', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis 연결 종료');
    }
  }

  /** Redis가 연결되어 있는지 확인 */
  get isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  /** Redis 클라이언트 인스턴스를 반환 (no-op 모드에서는 null) */
  getClient(): Redis | null {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    const result = await this.client.exists(key);
    return result === 1;
  }

  /** 키의 TTL 조회 (초 단위) */
  async ttl(key: string): Promise<number> {
    if (!this.client) return -2;
    return this.client.ttl(key);
  }

  /** 증분 (rate limiting 등에 사용) */
  async incr(key: string): Promise<number> {
    if (!this.client) return 0;
    return this.client.incr(key);
  }

  /** TTL 설정 */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    await this.client.expire(key, ttlSeconds);
  }
}
