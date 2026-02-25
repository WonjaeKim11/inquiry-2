import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiExceptionFilter, ZodValidationPipe } from '@inquiry/server-core';
import {
  ApiKeyAuthGuard,
  RequirePermissionGuard,
  RequirePermission,
} from '@inquiry/server-api-key';
import { ApiRateLimitGuard, ApiRateLimit } from '@inquiry/server-rate-limit';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { ContactService } from '../services/contact.service.js';
import { ContactAttributeService } from '../services/contact-attribute.service.js';
import { TypeDetectorService } from '../services/type-detector.service.js';
import {
  BulkUploadSchema,
  type BulkUploadDto,
} from '../dto/bulk-upload.dto.js';

/**
 * Management API v2 Contact 컨트롤러.
 * API Key 인증 + 환경별 권한 기반으로 연락처를 관리한다.
 * 절대 경로를 사용하여 RouterModule 수정 없이 v2/management 경로에 매핑된다.
 */
@Controller('v2/management/contacts')
@UseFilters(new ApiExceptionFilter())
@UseGuards(ApiKeyAuthGuard, RequirePermissionGuard, ApiRateLimitGuard)
@ApiRateLimit()
export class ContactManagementApiController {
  private readonly logger = new Logger(ContactManagementApiController.name);

  constructor(
    private readonly contactService: ContactService,
    private readonly attributeService: ContactAttributeService,
    private readonly typeDetector: TypeDetectorService,
    private readonly prisma: ServerPrismaService
  ) {}

  /**
   * POST /v2/management/contacts/bulk?environmentId=xxx
   * 최대 250건의 연락처를 일괄 생성한다.
   *
   * @param environmentId - 대상 환경 ID (쿼리 파라미터)
   * @param dto - Bulk Upload 요청 바디
   * @returns 생성/수정/오류 건수 요약
   */
  @Post('bulk')
  @RequirePermission('WRITE')
  @HttpCode(HttpStatus.CREATED)
  async bulkUpload(
    @Query('environmentId') environmentId: string,
    @Body(new ZodValidationPipe(BulkUploadSchema)) dto: BulkUploadDto
  ) {
    // 기본 속성 키 시딩 (최초 접근 시 멱등하게 실행)
    await this.attributeService.seedDefaultKeys(environmentId);
    const keyMap = await this.attributeService.getKeyMap(environmentId);

    const results = {
      created: 0,
      updated: 0,
      errors: 0,
    };

    for (const item of dto.contacts) {
      try {
        if (item.userId) {
          // userId가 있으면 identify 방식으로 처리 (기존 연락처 upsert)
          const allAttributes = {
            ...item.attributes,
            ...(item.email && { email: item.email }),
          };
          const { isNew } = await this.contactService.identifyByUserId(
            environmentId,
            item.userId,
            allAttributes
          );
          if (isNew) {
            results.created++;
          } else {
            results.updated++;
          }
        } else {
          // userId 없으면 새 연락처 생성 + 속성 부여
          await this.createContactWithAttributes(
            environmentId,
            { ...item.attributes, ...(item.email && { email: item.email }) },
            keyMap
          );
          results.created++;
        }
      } catch (error) {
        results.errors++;
        this.logger.warn(`Bulk upload 레코드 처리 실패: ${error}`);
      }
    }

    return { data: results };
  }

  /**
   * GET /v2/management/contacts/:id?environmentId=xxx
   * 연락처 단건 조회.
   *
   * @param environmentId - 대상 환경 ID (쿼리 파라미터)
   * @param id - 연락처 ID
   * @returns 속성이 포함된 연락처 정보
   */
  @Get(':id')
  @RequirePermission('READ')
  findById(
    @Query('environmentId') environmentId: string,
    @Param('id') id: string
  ) {
    return this.contactService.findById(id, environmentId);
  }

  /**
   * DELETE /v2/management/contacts/:id?environmentId=xxx
   * 연락처 삭제.
   *
   * @param environmentId - 대상 환경 ID (쿼리 파라미터)
   * @param id - 삭제 대상 연락처 ID
   */
  @Delete(':id')
  @RequirePermission('MANAGE')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Query('environmentId') environmentId: string,
    @Param('id') id: string
  ) {
    return this.contactService.delete(id, environmentId, 'api-key');
  }

  /**
   * 속성과 함께 새 연락처를 생성한다.
   * userId가 없는 연락처에 대해 직접 Contact 레코드를 생성하고,
   * 전달된 속성을 키별로 upsert한다.
   *
   * @param environmentId - 대상 환경 ID
   * @param attributes - 연락처에 설정할 속성 키-값 쌍
   * @param keyMap - 환경의 속성 키 맵 (캐싱용)
   * @returns 생성된 연락처 ID
   */
  private async createContactWithAttributes(
    environmentId: string,
    attributes: Record<string, unknown>,
    keyMap: Map<
      string,
      {
        id: string;
        key: string;
        dataType: string;
        type: string;
        isUnique: boolean;
      }
    >
  ): Promise<string> {
    const contact = await this.prisma.contact.create({
      data: { environmentId },
    });

    for (const [attrKey, attrValue] of Object.entries(attributes)) {
      if (attrValue === undefined || attrValue === null) continue;

      let keyInfo = keyMap.get(attrKey);

      // 키가 없으면 자동 생성 (CUSTOM 타입)
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
          // safe identifier 위반 등으로 키 생성 실패 시 건너뜀
          continue;
        }
      }

      await this.attributeService.upsertAttributeValue(
        contact.id,
        keyInfo.id,
        attrValue,
        keyInfo.dataType as 'STRING' | 'NUMBER' | 'DATE'
      );
    }

    return contact.id;
  }
}
