import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditLogService } from '@inquiry/server-audit-log';
import { ContactAttributeService } from './contact-attribute.service.js';
import { TypeDetectorService } from './type-detector.service.js';
import { DuplicateStrategyService } from './duplicate-strategy.service.js';
import {
  MAX_CSV_RECORDS,
  SAFE_IDENTIFIER_REGEX,
} from '../constants/contact.constants.js';
import { DuplicateStrategy } from '../interfaces/contact.types.js';
import type { CsvImportResult } from '../interfaces/contact.types.js';
import { parse } from 'csv-parse/sync';

/**
 * CSV Import 서비스.
 * CSV 파일을 파싱하여 연락처를 대량으로 가져오는 전체 파이프라인을 담당한다.
 *
 * 처리 흐름:
 * 1. CSV 파싱 및 기본 유효성 검증
 * 2. 메타데이터 추출 (email/userId 목록, 속성 키 목록)
 * 3. DB 병렬 조회 (기존 연락처, 속성 키)
 * 4. Lookup Map 구성
 * 5. 타입 탐지 + 검증
 * 6. 누락 속성 키 자동 생성
 * 7. 레코드별 중복 전략 적용 처리
 * 8. 결과 집계 반환
 */
@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly attributeService: ContactAttributeService,
    private readonly typeDetector: TypeDetectorService,
    private readonly duplicateStrategy: DuplicateStrategyService
  ) {}

  /**
   * CSV Import 전체 파이프라인을 실행한다.
   *
   * @param environmentId - 대상 환경 ID
   * @param fileBuffer - CSV 파일 버퍼
   * @param strategy - 중복 처리 전략 (skip, update, overwrite)
   * @param userId - Import를 수행하는 사용자 ID (감사 로그용)
   * @returns Import 결과 (생성/수정/건너뛰기/오류 수)
   */
  async importCsv(
    environmentId: string,
    fileBuffer: Buffer,
    strategy: DuplicateStrategy,
    userId: string
  ): Promise<CsvImportResult> {
    // 1. CSV 파싱
    const records = this.parseCsv(fileBuffer);

    // 2. 기본 검증
    this.validateRecords(records);

    // 3. 기본 속성 키 시딩 (최초 접근 시 email, userId 등 default 키 보장)
    await this.attributeService.seedDefaultKeys(environmentId);

    // 4. 메타데이터 추출
    const emails = records
      .map((r) => r['email'] as string | undefined)
      .filter((e): e is string => !!e);
    const userIds = records
      .map((r) => r['userId'] as string | undefined)
      .filter((u): u is string => !!u);
    const csvKeys = this.extractCsvKeys(records);

    // 5. DB 병렬 조회 (속성 키 맵, email/userId별 기존 연락처)
    const [keyMap, existingByEmail, existingByUserId] = await Promise.all([
      this.attributeService.getKeyMap(environmentId),
      this.findContactsByAttributeValues(environmentId, 'email', emails),
      this.findContactsByAttributeValues(environmentId, 'userId', userIds),
    ]);

    // 6. 누락 속성 키 자동 생성 (타입 탐지 포함)
    await this.createMissingKeys(environmentId, csvKeys, keyMap, records);

    // 7. 레코드별 처리
    const result: CsvImportResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    for (const record of records) {
      try {
        await this.processRecord(
          environmentId,
          record,
          strategy,
          keyMap,
          existingByEmail,
          existingByUserId
        );

        // 결과 집계: 중복 전략과 기존 연락처 존재 여부에 따라 카운트
        const email = record['email'] as string | undefined;
        const recordUserId = record['userId'] as string | undefined;
        const existingContactId =
          (email && existingByEmail.get(email)) ||
          (recordUserId && existingByUserId.get(recordUserId));

        if (existingContactId && strategy === DuplicateStrategy.SKIP) {
          result.skipped++;
        } else if (existingContactId) {
          result.updated++;
        } else {
          result.created++;
        }
      } catch (error) {
        result.errors++;
        this.logger.warn(`CSV 레코드 처리 실패: ${error}`);
      }
    }

    // 감사 로그 기록
    this.auditLogService.logEvent({
      action: 'contact.csv_imported',
      userId,
      targetType: 'environment',
      targetId: environmentId,
      metadata: { strategy, ...result },
    });

    this.logger.log(
      `CSV Import 완료: created=${result.created}, updated=${result.updated}, skipped=${result.skipped}, errors=${result.errors}`
    );

    return result;
  }

  /**
   * CSV 파일 버퍼를 파싱하여 레코드 배열을 반환한다.
   * columns: true 옵션으로 헤더를 키로 사용한다.
   *
   * @param fileBuffer - CSV 파일 버퍼
   * @returns 파싱된 레코드 배열
   * @throws BadRequestException 파싱 실패 시
   */
  private parseCsv(fileBuffer: Buffer): Record<string, unknown>[] {
    try {
      const content = fileBuffer.toString('utf-8');
      return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: false, // 문자열 그대로 유지 (타입 탐지는 별도 수행)
      }) as Record<string, unknown>[];
    } catch {
      throw new BadRequestException(
        'CSV 파일 파싱에 실패했습니다. 형식을 확인해주세요.'
      );
    }
  }

  /**
   * 레코드 기본 검증을 수행한다.
   * - 빈 파일 체크
   * - 최대 레코드 수 초과 체크
   * - CSV 파일 내 email/userId 중복 체크
   *
   * @param records - 파싱된 CSV 레코드 배열
   * @throws BadRequestException 검증 실패 시
   */
  private validateRecords(records: Record<string, unknown>[]) {
    if (records.length === 0) {
      throw new BadRequestException('CSV 파일에 레코드가 없습니다.');
    }

    if (records.length > MAX_CSV_RECORDS) {
      throw new BadRequestException(
        `CSV 파일의 레코드 수(${records.length})가 최대 허용 수(${MAX_CSV_RECORDS})를 초과합니다.`
      );
    }

    // email 중복 검사 (대소문자 무시)
    const emailSet = new Set<string>();
    for (let i = 0; i < records.length; i++) {
      const email = records[i]['email'] as string | undefined;
      if (email) {
        const lower = email.toLowerCase();
        if (emailSet.has(lower)) {
          throw new BadRequestException(
            `CSV 파일 내에 중복된 email이 있습니다: ${email} (${i + 2}번째 행)`
          );
        }
        emailSet.add(lower);
      }
    }

    // userId 중복 검사
    const userIdSet = new Set<string>();
    for (let i = 0; i < records.length; i++) {
      const uid = records[i]['userId'] as string | undefined;
      if (uid) {
        if (userIdSet.has(uid)) {
          throw new BadRequestException(
            `CSV 파일 내에 중복된 userId가 있습니다: ${uid} (${i + 2}번째 행)`
          );
        }
        userIdSet.add(uid);
      }
    }
  }

  /**
   * CSV 레코드의 첫 번째 행에서 속성 키(컬럼명) 목록을 추출한다.
   *
   * @param records - 파싱된 CSV 레코드 배열
   * @returns 속성 키 문자열 배열
   */
  private extractCsvKeys(records: Record<string, unknown>[]): string[] {
    if (records.length === 0) return [];
    return Object.keys(records[0]);
  }

  /**
   * 특정 속성 키의 값들로 기존 연락처를 조회하여 값->contactId 맵을 반환한다.
   * email 또는 userId 속성 값으로 기존 연락처를 빠르게 찾기 위해 사용한다.
   *
   * @param environmentId - 대상 환경 ID
   * @param keyName - 조회할 속성 키 이름 (email 또는 userId)
   * @param values - 조회할 속성 값 배열
   * @returns 값 -> contactId 매핑 맵
   */
  private async findContactsByAttributeValues(
    environmentId: string,
    keyName: string,
    values: string[]
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (values.length === 0) return result;

    const attrKey = await this.prisma.contactAttributeKey.findUnique({
      where: {
        key_environmentId: { key: keyName, environmentId },
      },
    });

    if (!attrKey) return result;

    const attrValues = await this.prisma.contactAttributeValue.findMany({
      where: {
        contactAttributeKeyId: attrKey.id,
        value: { in: values },
        contact: { environmentId },
      },
      select: { value: true, contactId: true },
    });

    for (const av of attrValues) {
      result.set(av.value, av.contactId);
    }

    return result;
  }

  /**
   * CSV 컬럼 중 아직 DB에 없는 속성 키를 자동 생성한다.
   * 컬럼의 전체 값을 분석하여 적절한 데이터 타입(STRING/NUMBER/DATE)을 결정한다.
   * safe identifier 규칙에 맞지 않는 컬럼은 건너뛴다.
   *
   * @param environmentId - 대상 환경 ID
   * @param csvKeys - CSV 컬럼명 배열
   * @param keyMap - 기존 속성 키 맵 (누락 키 생성 후 업데이트됨)
   * @param records - CSV 레코드 배열 (타입 탐지용)
   */
  private async createMissingKeys(
    environmentId: string,
    csvKeys: string[],
    keyMap: Map<
      string,
      {
        id: string;
        key: string;
        dataType: string;
        type: string;
        isUnique: boolean;
      }
    >,
    records: Record<string, unknown>[]
  ) {
    for (const csvKey of csvKeys) {
      if (keyMap.has(csvKey)) continue;

      // safe identifier 검증: 규칙에 맞지 않는 컬럼명은 건너뜀
      if (!SAFE_IDENTIFIER_REGEX.test(csvKey)) {
        this.logger.warn(
          `CSV 컬럼 '${csvKey}'는 safe identifier 규칙에 맞지 않아 건너뜁니다.`
        );
        continue;
      }

      // 컬럼의 전체 값으로 데이터 타입 결정
      const columnValues = records.map((r) => r[csvKey]);
      const dataType = this.typeDetector.determineColumnType(
        columnValues,
        'csv'
      );

      try {
        const created = await this.attributeService.createKey(environmentId, {
          key: csvKey,
          dataType,
        });
        keyMap.set(csvKey, {
          id: created.id,
          key: created.key,
          dataType: created.dataType,
          type: created.type,
          isUnique: created.isUnique,
        });
      } catch (error) {
        this.logger.warn(`속성 키 '${csvKey}' 자동 생성 실패: ${error}`);
      }
    }
  }

  /**
   * 단일 CSV 레코드를 처리한다.
   * 중복 전략에 따라 기존 연락처를 건너뛰거나, 업데이트하거나, 덮어쓰기한다.
   * 새 연락처는 생성 후 Lookup Map에 추가하여 후속 레코드의 중복 감지에 활용한다.
   *
   * @param environmentId - 대상 환경 ID
   * @param record - CSV 레코드 객체
   * @param strategy - 중복 처리 전략
   * @param keyMap - 속성 키 맵
   * @param existingByEmail - email -> contactId 매핑 맵
   * @param existingByUserId - userId -> contactId 매핑 맵
   */
  private async processRecord(
    environmentId: string,
    record: Record<string, unknown>,
    strategy: DuplicateStrategy,
    keyMap: Map<
      string,
      {
        id: string;
        key: string;
        dataType: string;
        type: string;
        isUnique: boolean;
      }
    >,
    existingByEmail: Map<string, string>,
    existingByUserId: Map<string, string>
  ): Promise<void> {
    const email = record['email'] as string | undefined;
    const recordUserId = record['userId'] as string | undefined;

    // 기존 연락처 찾기 (email 우선, userId 대체)
    const existingContactId =
      (email && existingByEmail.get(email)) ||
      (recordUserId && existingByUserId.get(recordUserId)) ||
      null;

    // skip 전략: 기존 연락처가 있으면 무시
    if (existingContactId && strategy === DuplicateStrategy.SKIP) {
      return;
    }

    let contactId: string;

    if (existingContactId && strategy === DuplicateStrategy.OVERWRITE) {
      // overwrite: 기존 속성 값 전부 삭제 후 CSV 값으로 대체
      await this.prisma.contactAttributeValue.deleteMany({
        where: { contactId: existingContactId },
      });
      contactId = existingContactId;
    } else if (existingContactId) {
      // update: 기존 속성 유지 + 새 속성 upsert
      contactId = existingContactId;
    } else {
      // 새 연락처 생성
      const newContact = await this.prisma.contact.create({
        data: { environmentId },
      });
      contactId = newContact.id;

      // Lookup Map 업데이트 (후속 레코드 중복 감지용)
      if (email) existingByEmail.set(email, contactId);
      if (recordUserId) existingByUserId.set(recordUserId, contactId);
    }

    // 속성 값 upsert: 빈 값과 키 맵에 없는 속성은 건너뜀
    for (const [key, value] of Object.entries(record)) {
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ''
      ) {
        continue;
      }

      const keyInfo = keyMap.get(key);
      if (!keyInfo) continue; // safe identifier 실패 등으로 키 없음

      await this.attributeService.upsertAttributeValue(
        contactId,
        keyInfo.id,
        value,
        keyInfo.dataType as 'STRING' | 'NUMBER' | 'DATE'
      );
    }
  }
}
