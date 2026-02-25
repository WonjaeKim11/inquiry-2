import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  UseFilters,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiExceptionFilter, ZodValidationPipe } from '@inquiry/server-core';
import { LicenseGuard, RequireLicense } from '@inquiry/server-license';
import { ContactService } from '../services/contact.service.js';
import { CsvImportService } from '../services/csv-import.service.js';
import { PersonalizedLinkService } from '../services/personalized-link.service.js';
import {
  CreatePersonalizedLinkSchema,
  type CreatePersonalizedLinkDto,
} from '../dto/create-personalized-link.dto.js';
import {
  ContactAccessGuard,
  ContactMinRole,
} from '../guards/contact-access.guard.js';
import {
  SearchContactSchema,
  type SearchContactDto,
} from '../dto/search-contact.dto.js';
import { DuplicateStrategy } from '../interfaces/contact.types.js';
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
  constructor(
    private readonly contactService: ContactService,
    private readonly csvImportService: CsvImportService,
    private readonly personalizedLinkService: PersonalizedLinkService
  ) {}

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
   * POST /environments/:envId/contacts/import
   * CSV 파일을 업로드하여 연락처를 대량 가져온다.
   * multipart/form-data로 file 필드에 CSV 파일을 전송한다.
   * duplicateStrategy 필드로 중복 처리 전략을 지정한다 (기본값: skip).
   */
  @Post('import')
  @ContactMinRole('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @Param('envId') envId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('duplicateStrategy') duplicateStrategyRaw: string,
    @Req() req: Request
  ) {
    if (!file) {
      throw new BadRequestException('CSV 파일이 필요합니다.');
    }

    // 중복 전략 문자열 -> enum 매핑 (잘못된 값이면 기본값 skip)
    const strategyMap: Record<string, DuplicateStrategy> = {
      skip: DuplicateStrategy.SKIP,
      update: DuplicateStrategy.UPDATE,
      overwrite: DuplicateStrategy.OVERWRITE,
    };

    const strategy =
      strategyMap[duplicateStrategyRaw ?? 'skip'] ?? DuplicateStrategy.SKIP;
    const user = req.user as { id: string };

    return this.csvImportService.importCsv(
      envId,
      file.buffer,
      strategy,
      user.id
    );
  }

  /**
   * POST /environments/:envId/contacts/personalized-links
   * 개인화된 설문 링크를 생성한다.
   * 동일 연락처+설문 조합에 기존 링크가 있으면 만료일만 갱신한다.
   */
  @Post('personalized-links')
  @ContactMinRole('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  createPersonalizedLinks(
    @Param('envId') envId: string,
    @Body(new ZodValidationPipe(CreatePersonalizedLinkSchema))
    dto: CreatePersonalizedLinkDto
  ) {
    return this.personalizedLinkService.createLinks(
      dto.surveyId,
      dto.contactIds,
      dto.expirationDays
    );
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
