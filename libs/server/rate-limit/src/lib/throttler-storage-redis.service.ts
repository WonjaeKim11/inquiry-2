import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { RedisService } from '@inquiry/server-redis';

/**
 * Redis 기반 Throttler 스토리지.
 * RedisService가 연결되어 있으면 Redis를 사용하고,
 * 미연결 시 메모리 기반 폴백으로 동작한다.
 */
@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  /** 메모리 폴백용 저장소 */
  private memoryStorage = new Map<
    string,
    { totalHits: number; expiresAt: number }
  >();

  constructor(private readonly redis: RedisService) {}

  /** 스로틀 키에 대한 적중 횟수 증가 */
  async increment(
    key: string,
    ttl: number,
    _limit: number,
    _blockDuration: number,
    _throttlerName: string
  ): Promise<ThrottlerStorageRecord> {
    // Redis가 연결되어 있으면 Redis 사용
    if (this.redis.isConnected) {
      return this.incrementWithRedis(key, ttl);
    }

    // 메모리 폴백
    return this.incrementWithMemory(key, ttl);
  }

  /** Redis를 사용한 증분 */
  private async incrementWithRedis(
    key: string,
    ttl: number
  ): Promise<ThrottlerStorageRecord> {
    const prefixedKey = `throttle:${key}`;
    const totalHits = await this.redis.incr(prefixedKey);

    // 첫 번째 적중이면 TTL 설정
    if (totalHits === 1) {
      await this.redis.expire(prefixedKey, Math.ceil(ttl / 1000));
    }

    const currentTtl = await this.redis.ttl(prefixedKey);
    const timeToExpire = currentTtl > 0 ? currentTtl * 1000 : ttl;

    return {
      totalHits,
      timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  /** 메모리를 사용한 증분 (폴백) */
  private incrementWithMemory(
    key: string,
    ttl: number
  ): ThrottlerStorageRecord {
    const now = Date.now();

    // 만료된 항목 정리
    const existing = this.memoryStorage.get(key);
    if (existing && existing.expiresAt < now) {
      this.memoryStorage.delete(key);
    }

    const record = this.memoryStorage.get(key);
    if (record) {
      record.totalHits++;
      return {
        totalHits: record.totalHits,
        timeToExpire: record.expiresAt - now,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    const newRecord = { totalHits: 1, expiresAt: now + ttl };
    this.memoryStorage.set(key, newRecord);

    return {
      totalHits: 1,
      timeToExpire: ttl,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
