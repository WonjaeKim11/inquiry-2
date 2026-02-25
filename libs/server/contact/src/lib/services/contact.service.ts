import { Injectable, Logger } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditLogService } from '@inquiry/server-audit-log';
import { ResourceNotFoundException } from '@inquiry/server-core';
import { ContactAttributeService } from './contact-attribute.service.js';
import { TypeDetectorService } from './type-detector.service.js';
import type {
  ContactWithAttributes,
  PaginatedResult,
} from '../interfaces/contact.types.js';

/**
 * 연락처 CRUD 핵심 비즈니스 로직 서비스.
 * 목록 조회, 단건 조회, 삭제, SDK identify 기능을 제공한다.
 */
@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly attributeService: ContactAttributeService,
    private readonly typeDetector: TypeDetectorService
  ) {}

  /**
   * 연락처 목록 조회 (페이지네이션 + 검색).
   * 검색은 속성 값과 연락처 ID에 대해 case-insensitive로 수행한다.
   *
   * @param environmentId - 대상 환경 ID
   * @param query - 페이지네이션 및 검색 파라미터
   * @returns 페이지네이션된 연락처 목록
   */
  async findAll(
    environmentId: string,
    query: { page: number; pageSize: number; search?: string }
  ): Promise<PaginatedResult<ContactWithAttributes>> {
    const { page, pageSize, search } = query;
    const skip = (page - 1) * pageSize;

    // 기본 속성 키 시딩 (최초 접근 시)
    await this.attributeService.seedDefaultKeys(environmentId);

    const where: Record<string, unknown> = { environmentId };

    if (search && search.trim()) {
      const searchTerm = search.trim();
      // ID 또는 속성 값으로 검색
      where['OR'] = [
        { id: { contains: searchTerm, mode: 'insensitive' } },
        {
          attributeValues: {
            some: {
              value: { contains: searchTerm, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [contacts, totalCount] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          attributeValues: {
            include: {
              contactAttributeKey: {
                select: { key: true, dataType: true },
              },
            },
          },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    // 속성 값을 평탄화된 객체로 변환
    const data: ContactWithAttributes[] = contacts.map((contact) => ({
      id: contact.id,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      environmentId: contact.environmentId,
      attributes: this.flattenAttributes(contact.attributeValues),
    }));

    return { data, totalCount, page, pageSize };
  }

  /**
   * 연락처 단건 조회 (속성 포함).
   *
   * @param contactId - 조회 대상 연락처 ID
   * @param environmentId - 대상 환경 ID
   * @returns 속성이 포함된 연락처 정보
   * @throws ResourceNotFoundException 연락처를 찾을 수 없는 경우
   */
  async findById(
    contactId: string,
    environmentId: string
  ): Promise<ContactWithAttributes> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, environmentId },
      include: {
        attributeValues: {
          include: {
            contactAttributeKey: {
              select: { key: true, dataType: true },
            },
          },
        },
      },
    });

    if (!contact) {
      throw new ResourceNotFoundException('Contact', contactId);
    }

    return {
      id: contact.id,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      environmentId: contact.environmentId,
      attributes: this.flattenAttributes(contact.attributeValues),
    };
  }

  /**
   * 연락처 삭제 (hard delete).
   * Cascade로 속성 값이 자동 삭제된다.
   *
   * @param contactId - 삭제 대상 연락처 ID
   * @param environmentId - 대상 환경 ID
   * @param userId - 삭제를 수행하는 사용자 ID (감사 로그용)
   * @throws ResourceNotFoundException 연락처를 찾을 수 없는 경우
   */
  async delete(
    contactId: string,
    environmentId: string,
    userId: string
  ): Promise<void> {
    const existing = await this.prisma.contact.findFirst({
      where: { id: contactId, environmentId },
    });

    if (!existing) {
      throw new ResourceNotFoundException('Contact', contactId);
    }

    await this.prisma.contact.delete({
      where: { id: contactId },
    });

    // 감사 로그 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'contact.deleted',
      userId,
      targetType: 'contact',
      targetId: contactId,
      metadata: { environmentId },
    });

    this.logger.debug(`연락처 삭제 완료: ${contactId}`);
  }

  /**
   * SDK identify: userId 기반 연락처 생성 또는 업데이트.
   * userId 속성으로 기존 연락처를 검색하고, 없으면 새로 생성한다.
   * 추가 속성은 자동으로 키를 생성하여 upsert한다.
   *
   * @param environmentId - 대상 환경 ID
   * @param userId - SDK에서 전달한 사용자 식별자
   * @param attributes - 추가 속성 키-값 쌍
   * @returns contactId와 신규 생성 여부
   */
  async identifyByUserId(
    environmentId: string,
    userId: string,
    attributes: Record<string, unknown>
  ): Promise<{ contactId: string; isNew: boolean }> {
    // 기본 속성 키 시딩
    await this.attributeService.seedDefaultKeys(environmentId);

    const keyMap = await this.attributeService.getKeyMap(environmentId);
    const userIdKey = keyMap.get('userId');

    if (!userIdKey) {
      throw new Error('userId 속성 키가 존재하지 않습니다.');
    }

    // userId 속성 값으로 기존 연락처 검색
    const existingValue = await this.prisma.contactAttributeValue.findFirst({
      where: {
        contactAttributeKeyId: userIdKey.id,
        value: userId,
        contact: { environmentId },
      },
      select: { contactId: true },
    });

    let contactId: string;
    let isNew: boolean;

    if (existingValue) {
      contactId = existingValue.contactId;
      isNew = false;
    } else {
      // 새 연락처 생성
      const newContact = await this.prisma.contact.create({
        data: { environmentId },
      });
      contactId = newContact.id;
      isNew = true;

      // userId 속성 설정
      await this.attributeService.upsertAttributeValue(
        contactId,
        userIdKey.id,
        userId,
        'STRING'
      );
    }

    // 추가 속성 upsert
    for (const [attrKey, attrValue] of Object.entries(attributes)) {
      if (attrValue === undefined || attrValue === null) continue;

      let keyInfo = keyMap.get(attrKey);

      // 키가 없으면 자동 생성 (CUSTOM)
      if (!keyInfo) {
        const dataType = this.typeDetector.detectType(attrValue, 'sdk');
        try {
          const created = await this.attributeService.createKey(environmentId, {
            key: attrKey,
            dataType,
          });
          keyInfo = {
            id: created.id,
            key: created.key,
            dataType: created.dataType,
            type: created.type,
            isUnique: created.isUnique,
          };
          keyMap.set(attrKey, keyInfo);
        } catch {
          // safe identifier 위반 등으로 생성 실패 시 건너뜀
          this.logger.warn(`속성 키 '${attrKey}' 자동 생성 실패, 건너뜁니다.`);
          continue;
        }
      }

      await this.attributeService.upsertAttributeValue(
        contactId,
        keyInfo.id,
        attrValue,
        keyInfo.dataType as 'STRING' | 'NUMBER' | 'DATE'
      );
    }

    return { contactId, isNew };
  }

  /**
   * 속성 값 배열을 평탄화된 객체로 변환한다.
   * dataType에 따라 적절한 타입의 값을 반환한다.
   *
   * @param attributeValues - Prisma에서 조회된 속성 값 배열
   * @returns key-value 평탄 객체
   */
  private flattenAttributes(
    attributeValues: Array<{
      value: string;
      numberValue: number | null;
      dateValue: Date | null;
      contactAttributeKey: { key: string; dataType: string };
    }>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const av of attributeValues) {
      const key = av.contactAttributeKey.key;
      const dataType = av.contactAttributeKey.dataType;

      if (dataType === 'NUMBER' && av.numberValue !== null) {
        result[key] = av.numberValue;
      } else if (dataType === 'DATE' && av.dateValue !== null) {
        result[key] = av.dateValue;
      } else {
        result[key] = av.value;
      }
    }

    return result;
  }
}
