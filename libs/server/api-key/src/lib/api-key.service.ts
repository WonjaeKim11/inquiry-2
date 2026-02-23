import { Injectable, Logger } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import type { ApiKeyAuthObject } from './interfaces/api-key-auth.interface';

/** API 키 생성 결과 (평문 키는 생성 시에만 반환) */
export interface ApiKeyCreateResult {
  id: string;
  label: string;
  /** 평문 API 키 (fbk_ 접두사). 이후 조회 불가. */
  plainKey: string;
  environmentPermissions: {
    environmentId: string;
    permission: string;
  }[];
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * API 키 관리 서비스 (조직 스코프).
 * fbk_ 접두사 + 랜덤 문자열로 키를 생성하고, bcrypt 해시를 저장한다.
 * 환경별 권한(READ/WRITE/MANAGE)을 함께 관리한다.
 */
@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private static readonly KEY_PREFIX = 'fbk_';
  private static readonly KEY_LENGTH = 32;

  constructor(private readonly prisma: ServerPrismaService) {}

  /** 새 API 키 생성 (조직 스코프, 환경별 권한 포함) */
  async create(input: {
    label: string;
    organizationId: string;
    environmentPermissions: {
      environmentId: string;
      permission: 'READ' | 'WRITE' | 'MANAGE';
    }[];
    expiresAt?: string;
  }): Promise<ApiKeyCreateResult> {
    // fbk_ + 랜덤 32바이트 hex 문자열로 고유 키 생성
    const plainKey = `${ApiKeyService.KEY_PREFIX}${randomBytes(
      ApiKeyService.KEY_LENGTH
    ).toString('hex')}`;
    const hashedKey = await bcrypt.hash(plainKey, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        label: input.label,
        hashedKey,
        organizationId: input.organizationId,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        environmentPermissions: {
          create: input.environmentPermissions.map((ep) => ({
            environmentId: ep.environmentId,
            permission: ep.permission,
          })),
        },
      },
      include: {
        environmentPermissions: {
          select: { environmentId: true, permission: true },
        },
      },
    });

    this.logger.log(
      `API 키 생성 완료: ${apiKey.id} (org: ${input.organizationId})`
    );

    return {
      id: apiKey.id,
      label: apiKey.label,
      plainKey,
      environmentPermissions: apiKey.environmentPermissions,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  /** API 키 검증: 평문 키 → 해시 비교 → ApiKeyAuthObject 반환 */
  async validate(plainKey: string): Promise<ApiKeyAuthObject | null> {
    // fbk_ 접두사 확인
    if (!plainKey.startsWith(ApiKeyService.KEY_PREFIX)) {
      return null;
    }

    // 만료되지 않은 모든 API 키를 조회하여 bcrypt 비교
    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        environmentPermissions: {
          select: { environmentId: true, permission: true },
        },
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

        return {
          apiKeyId: apiKey.id,
          organizationId: apiKey.organizationId,
          label: apiKey.label,
          environmentPermissions: apiKey.environmentPermissions.map((ep) => ({
            environmentId: ep.environmentId,
            permission: ep.permission as 'READ' | 'WRITE' | 'MANAGE',
          })),
        };
      }
    }

    return null;
  }

  /** API 키 삭제 */
  async revoke(id: string, organizationId: string): Promise<void> {
    await this.prisma.apiKey.delete({
      where: { id, organizationId },
    });
    this.logger.log(`API 키 삭제 완료: ${id}`);
  }

  /** 조직별 API 키 목록 조회 (해시 값은 반환하지 않음) */
  async listByOrganization(organizationId: string) {
    return this.prisma.apiKey.findMany({
      where: { organizationId },
      select: {
        id: true,
        label: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        environmentPermissions: {
          select: { environmentId: true, permission: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
