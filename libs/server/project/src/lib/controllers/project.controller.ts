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
import { ProjectService } from '../services/project.service.js';
import { CreateProjectSchema } from '../dto/create-project.dto.js';
import type { CreateProjectDto } from '../dto/create-project.dto.js';
import { UpdateProjectSchema } from '../dto/update-project.dto.js';
import type { UpdateProjectDto } from '../dto/update-project.dto.js';

/** JWT에서 추출한 인증된 사용자 정보 */
interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * 프로젝트 컨트롤러.
 * 프로젝트 CRUD API를 제공한다.
 * 모든 엔드포인트는 JWT 인증이 필수이다.
 */
@Controller()
@UseGuards(AuthGuard('jwt'))
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * POST /api/projects
   * 새 프로젝트를 생성한다.
   * 트랜잭션으로 production/development 2개 Environment를 동시 생성한다.
   * OWNER 또는 ADMIN만 호출 가능하다.
   */
  @Post('projects')
  @UsePipes(new ZodValidationPipe(CreateProjectSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProjectDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.projectService.createProject(user.id, dto, req.ip);
  }

  /**
   * GET /api/organizations/:orgId/projects
   * 조직에 속한 프로젝트 목록을 조회한다.
   * 조직 멤버만 접근 가능하다.
   */
  @Get('organizations/:orgId/projects')
  async findByOrganization(@Param('orgId') orgId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.projectService.getProjectsByOrganization(user.id, orgId);
  }

  /**
   * GET /api/projects/:projectId
   * 단일 프로젝트 정보를 조회한다.
   * 조직 멤버만 접근 가능하다.
   */
  @Get('projects/:projectId')
  async findOne(@Param('projectId') projectId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.projectService.getProject(user.id, projectId);
  }

  /**
   * PATCH /api/projects/:projectId
   * 프로젝트 정보를 부분 업데이트한다.
   * OWNER 또는 ADMIN만 수정 가능하다.
   */
  @Patch('projects/:projectId')
  @UsePipes(new ZodValidationPipe(UpdateProjectSchema))
  async update(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.projectService.updateProject(user.id, projectId, dto, req.ip);
  }

  /**
   * DELETE /api/projects/:projectId
   * 프로젝트를 삭제한다. Cascade로 하위 리소스도 함께 삭제된다.
   * OWNER만 삭제 가능하다.
   */
  @Delete('projects/:projectId')
  async remove(@Param('projectId') projectId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.projectService.deleteProject(user.id, projectId, req.ip);
  }
}
