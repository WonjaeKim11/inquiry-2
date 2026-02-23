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
import { ActionClassService } from '../services/action-class.service.js';
import { CreateActionClassSchema } from '../dto/create-action-class.dto.js';
import type { CreateActionClassDto } from '../dto/create-action-class.dto.js';
import { UpdateActionClassSchema } from '../dto/update-action-class.dto.js';
import type { UpdateActionClassDto } from '../dto/update-action-class.dto.js';

/** JWT에서 추출한 인증된 사용자 정보 */
interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * ActionClass 컨트롤러.
 * 사용자 행동 클래스 CRUD API를 제공한다.
 */
@Controller()
@UseGuards(AuthGuard('jwt'))
export class ActionClassController {
  constructor(private readonly actionClassService: ActionClassService) {}

  /**
   * POST /api/environments/:environmentId/action-classes
   * 새 ActionClass를 생성한다.
   * code 타입: key 필수, noCode 타입: noCodeConfig 필수
   */
  @Post('environments/:environmentId/action-classes')
  @UsePipes(new ZodValidationPipe(CreateActionClassSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('environmentId') environmentId: string,
    @Body() dto: CreateActionClassDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.actionClassService.createActionClass(
      user.id,
      environmentId,
      dto,
      req.ip
    );
  }

  /**
   * GET /api/environments/:environmentId/action-classes
   * 환경에 속한 ActionClass 목록을 조회한다.
   */
  @Get('environments/:environmentId/action-classes')
  async findByEnvironment(
    @Param('environmentId') environmentId: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.actionClassService.getActionClassesByEnvironment(
      user.id,
      environmentId
    );
  }

  /**
   * GET /api/action-classes/:actionClassId
   * 단일 ActionClass 정보를 조회한다.
   */
  @Get('action-classes/:actionClassId')
  async findOne(
    @Param('actionClassId') actionClassId: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.actionClassService.getActionClass(user.id, actionClassId);
  }

  /**
   * PATCH /api/action-classes/:actionClassId
   * ActionClass 정보를 부분 업데이트한다. type은 변경할 수 없다.
   */
  @Patch('action-classes/:actionClassId')
  @UsePipes(new ZodValidationPipe(UpdateActionClassSchema))
  async update(
    @Param('actionClassId') actionClassId: string,
    @Body() dto: UpdateActionClassDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.actionClassService.updateActionClass(
      user.id,
      actionClassId,
      dto,
      req.ip
    );
  }

  /**
   * DELETE /api/action-classes/:actionClassId
   * ActionClass를 삭제한다.
   */
  @Delete('action-classes/:actionClassId')
  async remove(
    @Param('actionClassId') actionClassId: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.actionClassService.deleteActionClass(
      user.id,
      actionClassId,
      req.ip
    );
  }
}
