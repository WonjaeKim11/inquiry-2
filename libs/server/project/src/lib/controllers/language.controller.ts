import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ZodValidationPipe } from '@inquiry/server-core';
import { RequireLicense, LicenseGuard } from '@inquiry/server-license';
import { LanguageService } from '../services/language.service.js';
import { CreateLanguageSchema } from '../dto/create-language.dto.js';
import type { CreateLanguageDto } from '../dto/create-language.dto.js';
import { UpdateLanguageSchema } from '../dto/update-language.dto.js';
import type { UpdateLanguageDto } from '../dto/update-language.dto.js';

/** JWT에서 추출한 인증된 사용자 정보 */
interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Language 컨트롤러.
 * 프로젝트의 다국어 설정 CRUD API를 제공한다.
 */
@Controller()
@UseGuards(AuthGuard('jwt'))
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  /**
   * POST /api/projects/:projectId/languages
   * 프로젝트에 새 언어를 등록한다.
   */
  @Post('projects/:projectId/languages')
  @UseGuards(LicenseGuard)
  @RequireLicense('multiLanguage')
  @UsePipes(new ZodValidationPipe(CreateLanguageSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateLanguageDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.languageService.createLanguage(user.id, projectId, dto, req.ip);
  }

  /**
   * GET /api/projects/:projectId/languages
   * 프로젝트에 등록된 언어 목록을 조회한다.
   */
  @Get('projects/:projectId/languages')
  async findByProject(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.languageService.getLanguagesByProject(user.id, projectId);
  }

  /**
   * PATCH /api/languages/:languageId
   * 언어 정보를 부분 업데이트한다.
   */
  @Patch('languages/:languageId')
  @UseGuards(LicenseGuard)
  @RequireLicense('multiLanguage')
  @UsePipes(new ZodValidationPipe(UpdateLanguageSchema))
  async update(
    @Param('languageId') languageId: string,
    @Body() dto: UpdateLanguageDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.languageService.updateLanguage(
      user.id,
      languageId,
      dto,
      req.ip
    );
  }

  /**
   * DELETE /api/languages/:languageId
   * 언어를 삭제한다.
   */
  @Delete('languages/:languageId')
  @UseGuards(LicenseGuard)
  @RequireLicense('multiLanguage')
  async remove(@Param('languageId') languageId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.languageService.deleteLanguage(user.id, languageId, req.ip);
  }
}
