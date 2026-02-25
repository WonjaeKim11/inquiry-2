import { Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { ProcessResult } from '../interfaces/contact.types.js';

/** CSV 레코드 데이터 */
interface CsvRecord {
  email?: string;
  userId?: string;
  [key: string]: unknown;
}

/** 속성 키 정보 */
interface AttributeKeyInfo {
  id: string;
  key: string;
  dataType: string;
  type: string;
  isUnique: boolean;
}

/**
 * 중복 처리 전략 서비스.
 * CSV Import 시 기존 연락처와의 중복을 3가지 전략으로 처리한다.
 *
 * - skip: 기존 연락처가 있으면 무시
 * - update: 기존 속성 유지 + 새 속성 upsert
 * - overwrite: 기존 속성 전부 삭제 후 CSV 값으로 대체
 */
@Injectable()
export class DuplicateStrategyService {
  /**
   * skip 전략: 기존 연락처가 있으면 무시한다.
   *
   * @param existingContactId - 기존 연락처 ID (없으면 null)
   * @param _record - CSV 레코드 (skip 전략에서는 미사용)
   * @param _attributeKeyMap - 속성 키 맵 (skip 전략에서는 미사용)
   * @param _prisma - Prisma 클라이언트 (skip 전략에서는 미사용)
   * @returns 처리 결과 (skipped 또는 created)
   */
  async processSkip(
    existingContactId: string | null,
    _record: CsvRecord,
    _attributeKeyMap: Map<string, AttributeKeyInfo>,
    _prisma: PrismaClient | any
  ): Promise<ProcessResult> {
    if (existingContactId) {
      return { action: 'skipped' };
    }
    // 기존 연락처 없음 -> 새로 생성해야 함을 표시
    return { action: 'created' };
  }

  /**
   * update 전략: 기존 속성 유지 + 새 속성 upsert.
   *
   * @param existingContactId - 기존 연락처 ID (없으면 null)
   * @returns 처리 결과 (updated 또는 created)
   */
  async processUpdate(
    existingContactId: string | null
  ): Promise<ProcessResult> {
    if (existingContactId) {
      return { action: 'updated', contactId: existingContactId };
    }
    return { action: 'created' };
  }

  /**
   * overwrite 전략: 기존 속성 전부 삭제 후 CSV 값으로 대체.
   *
   * @param existingContactId - 기존 연락처 ID (없으면 null)
   * @param prisma - Prisma 클라이언트 (속성 값 삭제에 사용)
   * @returns 처리 결과 (updated 또는 created)
   */
  async processOverwrite(
    existingContactId: string | null,
    prisma: PrismaClient | any
  ): Promise<ProcessResult> {
    if (existingContactId) {
      // 기존 속성 값 전부 삭제
      await prisma.contactAttributeValue.deleteMany({
        where: { contactId: existingContactId },
      });
      return { action: 'updated', contactId: existingContactId };
    }
    return { action: 'created' };
  }
}
