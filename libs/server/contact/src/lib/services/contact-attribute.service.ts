import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { ResourceNotFoundException } from '@inquiry/server-core';
import {
  MAX_ATTRIBUTE_KEYS,
  DEFAULT_ATTRIBUTE_KEYS,
  SAFE_IDENTIFIER_REGEX,
} from '../constants/contact.constants.js';
import { TypeDetectorService } from './type-detector.service.js';

/**
 * Contact 속성 키 CRUD + 속성 값 upsert 서비스.
 * 환경별 속성 키 관리와 연락처별 속성 값 저장을 담당한다.
 */
@Injectable()
export class ContactAttributeService {
  private readonly logger = new Logger(ContactAttributeService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly typeDetector: TypeDetectorService
  ) {}

  /**
   * 환경의 속성 키 목록을 조회한다.
   * @param environmentId - 대상 환경 ID
   * @returns 속성 키 목록 (타입순, 키순 정렬)
   */
  async findAllKeys(environmentId: string) {
    return this.prisma.contactAttributeKey.findMany({
      where: { environmentId },
      orderBy: [{ type: 'asc' }, { key: 'asc' }],
    });
  }

  /**
   * 속성 키를 생성한다.
   * - safe identifier 검증
   * - 최대 150개 제한
   * - default 키 이름과 충돌 불가
   *
   * @param environmentId - 대상 환경 ID
   * @param input - 생성할 속성 키 정보
   * @returns 생성된 속성 키
   */
  async createKey(
    environmentId: string,
    input: {
      key: string;
      name?: string;
      description?: string;
      dataType?: 'STRING' | 'NUMBER' | 'DATE';
    }
  ) {
    // safe identifier 검증
    if (!SAFE_IDENTIFIER_REGEX.test(input.key)) {
      throw new BadRequestException(
        `속성 키 '${input.key}'는 safe identifier 규칙에 맞지 않습니다. (소문자/대문자 알파벳으로 시작, 알파벳/숫자/언더스코어만 사용)`
      );
    }

    // default 키와 충돌 검사
    const isDefaultKey = DEFAULT_ATTRIBUTE_KEYS.some(
      (dk) => dk.key === input.key
    );
    if (isDefaultKey) {
      throw new BadRequestException(
        `'${input.key}'는 시스템 예약 속성 키입니다. 다른 이름을 사용하세요.`
      );
    }

    // 최대 키 수 확인
    const count = await this.prisma.contactAttributeKey.count({
      where: { environmentId },
    });
    if (count >= MAX_ATTRIBUTE_KEYS) {
      throw new BadRequestException(
        `환경당 최대 속성 키 수(${MAX_ATTRIBUTE_KEYS}개)를 초과했습니다.`
      );
    }

    return this.prisma.contactAttributeKey.create({
      data: {
        key: input.key,
        name: input.name ?? input.key,
        description: input.description,
        dataType: input.dataType ?? 'STRING',
        type: 'CUSTOM',
        environmentId,
      },
    });
  }

  /**
   * 속성 키를 수정한다 (CUSTOM 타입만).
   * DEFAULT 타입의 시스템 속성은 수정할 수 없다.
   *
   * @param keyId - 수정 대상 속성 키 ID
   * @param environmentId - 대상 환경 ID
   * @param input - 수정할 필드들
   * @returns 수정된 속성 키
   */
  async updateKey(
    keyId: string,
    environmentId: string,
    input: { name?: string; description?: string }
  ) {
    const existing = await this.prisma.contactAttributeKey.findFirst({
      where: { id: keyId, environmentId },
    });

    if (!existing) {
      throw new ResourceNotFoundException('ContactAttributeKey', keyId);
    }

    if (existing.type === 'DEFAULT') {
      throw new BadRequestException('시스템 속성은 수정할 수 없습니다.');
    }

    return this.prisma.contactAttributeKey.update({
      where: { id: keyId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
      },
    });
  }

  /**
   * 속성 키를 삭제한다 (CUSTOM 타입만).
   * Cascade로 모든 속성 값도 함께 삭제된다.
   * DEFAULT 타입의 시스템 속성은 삭제할 수 없다.
   *
   * @param keyId - 삭제 대상 속성 키 ID
   * @param environmentId - 대상 환경 ID
   */
  async deleteKey(keyId: string, environmentId: string) {
    const existing = await this.prisma.contactAttributeKey.findFirst({
      where: { id: keyId, environmentId },
    });

    if (!existing) {
      throw new ResourceNotFoundException('ContactAttributeKey', keyId);
    }

    if (existing.type === 'DEFAULT') {
      throw new BadRequestException('시스템 속성은 삭제할 수 없습니다.');
    }

    await this.prisma.contactAttributeKey.delete({
      where: { id: keyId },
    });
  }

  /**
   * 환경에 기본 속성 키를 시드한다.
   * 이미 존재하면 건너뛴다 (멱등).
   *
   * @param environmentId - 시드 대상 환경 ID
   */
  async seedDefaultKeys(environmentId: string) {
    for (const dk of DEFAULT_ATTRIBUTE_KEYS) {
      await this.prisma.contactAttributeKey.upsert({
        where: {
          key_environmentId: {
            key: dk.key,
            environmentId,
          },
        },
        create: {
          key: dk.key,
          name: dk.name,
          dataType: dk.dataType,
          isUnique: dk.isUnique,
          type: 'DEFAULT',
          environmentId,
        },
        update: {}, // 이미 존재하면 변경하지 않음
      });
    }
  }

  /**
   * 속성 값을 upsert한다.
   * 데이터 타입에 따라 value/numberValue/dateValue에 적절히 저장한다.
   *
   * @param contactId - 대상 연락처 ID
   * @param attributeKeyId - 속성 키 ID
   * @param value - 저장할 값
   * @param dataType - 데이터 타입 (STRING, NUMBER, DATE)
   * @returns upsert된 속성 값
   */
  async upsertAttributeValue(
    contactId: string,
    attributeKeyId: string,
    value: unknown,
    dataType: 'STRING' | 'NUMBER' | 'DATE'
  ) {
    const stringValue = String(value);
    let numberValue: number | null = null;
    let dateValue: Date | null = null;

    if (dataType === 'NUMBER') {
      const parsed = Number(value);
      if (!isNaN(parsed)) {
        numberValue = parsed;
      }
    } else if (dataType === 'DATE') {
      const parsed = new Date(String(value));
      if (!isNaN(parsed.getTime())) {
        dateValue = parsed;
      }
    }

    return this.prisma.contactAttributeValue.upsert({
      where: {
        contactId_contactAttributeKeyId: {
          contactId,
          contactAttributeKeyId: attributeKeyId,
        },
      },
      create: {
        contactId,
        contactAttributeKeyId: attributeKeyId,
        value: stringValue,
        numberValue,
        dateValue,
      },
      update: {
        value: stringValue,
        numberValue,
        dateValue,
      },
    });
  }

  /**
   * 속성 키 맵을 가져온다.
   * key(string) -> ContactAttributeKey 매핑.
   *
   * @param environmentId - 대상 환경 ID
   * @returns key -> 속성 키 정보 맵
   */
  async getKeyMap(environmentId: string): Promise<
    Map<
      string,
      {
        id: string;
        key: string;
        dataType: string;
        type: string;
        isUnique: boolean;
      }
    >
  > {
    const keys = await this.prisma.contactAttributeKey.findMany({
      where: { environmentId },
    });

    const map = new Map<
      string,
      {
        id: string;
        key: string;
        dataType: string;
        type: string;
        isUnique: boolean;
      }
    >();
    for (const k of keys) {
      map.set(k.key, {
        id: k.id,
        key: k.key,
        dataType: k.dataType,
        type: k.type,
        isUnique: k.isUnique,
      });
    }
    return map;
  }
}
