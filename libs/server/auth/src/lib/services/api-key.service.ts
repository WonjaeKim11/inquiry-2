import { Injectable, Logger } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

/** API 키 생성 결과 (평문 키는 생성 시에만 반환) */
export interface ApiKeyCreateResult {
  id: string;
  label: string;
  /** 평문 API 키 (fbk_ 접두사). 이후 조회 불가. */
  plainKey: string;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * API 키 관리 서비스.
 * fbk_ 접두사 + 랜덤 문자열로 키를 생성하고, bcrypt 해시를 저장한다.
 */
@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private static readonly KEY_PREFIX = 'fbk_';
  private static readonly KEY_LENGTH = 32;

  constructor(private readonly prisma: ServerPrismaService) {}

  /** 새 API 키 생성 */
  async create(input: {
    label: string;
    environmentId: string;
    expiresAt?: string;
  }): Promise<ApiKeyCreateResult> {
    // fbk_ + 랜덤 32바이트 hex 문자열
    const plainKey = `${ApiKeyService.KEY_PREFIX}${randomBytes(ApiKeyService.KEY_LENGTH).toString('hex')}`;
    const hashedKey = await bcrypt.hash(plainKey, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        label: input.label,
        hashedKey,
        environmentId: input.environmentId,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });

    this.logger.log(`API 키 생성 완료: ${apiKey.id}`);

    return {
      id: apiKey.id,
      label: apiKey.label,
      plainKey,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  /** API 키 검증: 평문 키 → 해시 비교 */
  async validate(
    plainKey: string
  ): Promise<{ id: string; environmentId: string } | null> {
    // fbk_ 접두사 확인
    if (!plainKey.startsWith(ApiKeyService.KEY_PREFIX)) {
      return null;
    }

    // 모든 API 키를 순회하며 bcrypt 비교 (해시된 값이므로 DB 검색 불가)
    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    for (const apiKey of apiKeys) {
      const isMatch = await bcrypt.compare(plainKey, apiKey.hashedKey);
      if (isMatch) {
        // 마지막 사용 시간 업데이트 (비동기, 에러 무시)
        this.prisma.apiKey
          .update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
          })
          .catch((err) =>
            this.logger.warn('API 키 사용 시간 업데이트 실패', err)
          );

        return { id: apiKey.id, environmentId: apiKey.environmentId };
      }
    }

    return null;
  }

  /** API 키 삭제 */
  async revoke(id: string): Promise<void> {
    await this.prisma.apiKey.delete({ where: { id } });
    this.logger.log(`API 키 삭제 완료: ${id}`);
  }

  /** 환경별 API 키 목록 조회 (해시 값은 반환하지 않음) */
  async listByEnvironment(environmentId: string) {
    return this.prisma.apiKey.findMany({
      where: { environmentId },
      select: {
        id: true,
        label: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
