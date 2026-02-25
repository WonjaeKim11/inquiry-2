import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExceptionFilter, ZodValidationPipe } from '@inquiry/server-core';
import { LicenseGuard, RequireLicense } from '@inquiry/server-license';
import { ContactService } from '../services/contact.service.js';
import {
  ContactAccessGuard,
  ContactMinRole,
} from '../guards/contact-access.guard.js';
import {
  SearchContactSchema,
  type SearchContactDto,
} from '../dto/search-contact.dto.js';
import type { Request } from 'express';

/**
 * 연락처 관리 내부 API 컨트롤러 (JWT 인증).
 * 환경별 연락처 목록 조회, 단건 조회, 삭제를 제공한다.
 */
@Controller('environments/:envId/contacts')
@UseFilters(new ApiExceptionFilter())
@UseGuards(AuthGuard('jwt'), LicenseGuard, ContactAccessGuard)
@RequireLicense('contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * GET /environments/:envId/contacts
   * 연락처 목록 조회 (페이지네이션 + 검색)
   */
  @Get()
  @ContactMinRole('MEMBER')
  findAll(
    @Param('envId') envId: string,
    @Query(new ZodValidationPipe(SearchContactSchema)) query: SearchContactDto
  ) {
    return this.contactService.findAll(envId, query);
  }

  /**
   * GET /environments/:envId/contacts/:id
   * 연락처 단건 조회
   */
  @Get(':id')
  @ContactMinRole('MEMBER')
  findById(@Param('envId') envId: string, @Param('id') id: string) {
    return this.contactService.findById(id, envId);
  }

  /**
   * DELETE /environments/:envId/contacts/:id
   * 연락처 삭제 (hard delete, ADMIN 이상만 가능)
   */
  @Delete(':id')
  @ContactMinRole('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('envId') envId: string,
    @Param('id') id: string,
    @Req() req: Request
  ) {
    const user = req.user as { id: string };
    return this.contactService.delete(id, envId, user.id);
  }
}
