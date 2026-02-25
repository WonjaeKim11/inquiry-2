import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiExceptionFilter, ZodValidationPipe } from '@inquiry/server-core';
import { EnvironmentIdGuard } from '@inquiry/server-client-api';
import { ContactService } from '../services/contact.service.js';
import {
  SdkIdentifySchema,
  type SdkIdentifyDto,
} from '../dto/sdk-identify.dto.js';

/**
 * Client API Contact 컨트롤러.
 * SDK identify 호출을 통한 연락처 자동 생성/업데이트를 제공한다.
 * 절대 경로를 사용하여 RouterModule 수정 없이 v2/client 경로에 매핑된다.
 */
@Controller('v2/client/:environmentId/contacts')
@UseFilters(new ApiExceptionFilter())
@UseGuards(EnvironmentIdGuard)
export class ContactClientApiController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * POST /v2/client/:environmentId/contacts/identify
   * SDK identify: userId 기반 연락처 자동 생성/업데이트.
   * 해당 userId를 가진 연락처가 이미 존재하면 속성을 업데이트하고,
   * 존재하지 않으면 새 연락처를 생성한다.
   *
   * @param environmentId - 대상 환경 ID (경로 파라미터)
   * @param dto - SDK Identify 요청 바디 (userId + attributes)
   * @returns contactId와 신규 생성 여부
   */
  @Post('identify')
  @HttpCode(HttpStatus.OK)
  async identify(
    @Param('environmentId') environmentId: string,
    @Body(new ZodValidationPipe(SdkIdentifySchema)) dto: SdkIdentifyDto
  ) {
    const result = await this.contactService.identifyByUserId(
      environmentId,
      dto.userId,
      dto.attributes
    );

    return {
      data: {
        contactId: result.contactId,
        isNew: result.isNew,
      },
    };
  }
}
