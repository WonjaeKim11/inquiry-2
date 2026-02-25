import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExceptionFilter, ZodValidationPipe } from '@inquiry/server-core';
import { LicenseGuard, RequireLicense } from '@inquiry/server-license';
import { ContactAttributeService } from '../services/contact-attribute.service.js';
import {
  CreateAttributeKeySchema,
  type CreateAttributeKeyDto,
} from '../dto/create-attribute-key.dto.js';
import {
  UpdateAttributeKeySchema,
  type UpdateAttributeKeyDto,
} from '../dto/update-attribute-key.dto.js';

/**
 * 연락처 속성 키 관리 컨트롤러 (내부 API, JWT 인증).
 * 환경별 속성 키의 조회, 생성, 수정, 삭제를 제공한다.
 */
@Controller('environments/:envId/contact-attribute-keys')
@UseFilters(new ApiExceptionFilter())
@UseGuards(AuthGuard('jwt'), LicenseGuard)
@RequireLicense('contacts')
export class ContactAttributeController {
  constructor(private readonly attributeService: ContactAttributeService) {}

  /** 속성 키 목록 조회 */
  @Get()
  findAll(@Param('envId') envId: string) {
    return this.attributeService.findAllKeys(envId);
  }

  /** 속성 키 생성 */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('envId') envId: string,
    @Body(new ZodValidationPipe(CreateAttributeKeySchema))
    dto: CreateAttributeKeyDto
  ) {
    return this.attributeService.createKey(envId, dto);
  }

  /** 속성 키 수정 (CUSTOM만) */
  @Put(':id')
  update(
    @Param('envId') envId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAttributeKeySchema))
    dto: UpdateAttributeKeyDto
  ) {
    return this.attributeService.updateKey(id, envId, dto);
  }

  /** 속성 키 삭제 (CUSTOM만) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('envId') envId: string, @Param('id') id: string) {
    return this.attributeService.deleteKey(id, envId);
  }
}
