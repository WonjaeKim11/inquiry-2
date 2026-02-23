import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { EnvironmentService } from '../services/environment.service.js';

/** JWT에서 추출한 인증된 사용자 정보 */
interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * 환경 컨트롤러.
 * 환경 조회 API를 제공한다.
 * Environment는 Project 생성 시 자동으로 생성되므로, 별도 생성/삭제 API는 없다.
 */
@Controller()
@UseGuards(AuthGuard('jwt'))
export class EnvironmentController {
  constructor(private readonly environmentService: EnvironmentService) {}

  /**
   * GET /api/projects/:projectId/environments
   * 프로젝트에 속한 환경 목록을 조회한다.
   */
  @Get('projects/:projectId/environments')
  async findByProject(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.environmentService.getEnvironmentsByProject(user.id, projectId);
  }

  /**
   * GET /api/environments/:environmentId
   * 단일 환경 정보를 조회한다.
   */
  @Get('environments/:environmentId')
  async findOne(
    @Param('environmentId') environmentId: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.environmentService.getEnvironment(user.id, environmentId);
  }
}
