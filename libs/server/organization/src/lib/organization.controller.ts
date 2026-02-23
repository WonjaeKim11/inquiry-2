import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ZodValidationPipe } from '@inquiry/server-core';
import { OrganizationService } from './organization.service.js';
import { CreateOrganizationSchema } from './dto/create-organization.dto.js';
import type { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateOrganizationSchema } from './dto/update-organization.dto.js';
import type { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { QueryOrganizationSchema } from './dto/query-organization.dto.js';
import type { QueryOrganizationDto } from './dto/query-organization.dto.js';
import { OrgRoleGuard } from './guards/org-role.guard.js';
import { OrgRoles } from './decorators/org-roles.decorator.js';

/** JWT에서 추출한 인증된 사용자 정보 */
interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * 조직 컨트롤러.
 * Organization CRUD 및 월간 응답 수 조회 API를 제공한다.
 * 모든 엔드포인트는 JWT 인증이 필수이다.
 */
@Controller('organizations')
@UseGuards(AuthGuard('jwt'))
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  /**
   * POST /api/organizations
   * 새 조직을 생성한다.
   * 인증된 사용자 누구나 호출 가능하며, 생성자가 자동으로 OWNER가 된다.
   */
  @Post()
  @UsePipes(new ZodValidationPipe(CreateOrganizationSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateOrganizationDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.organizationService.createOrganization(user.id, dto, req.ip);
  }

  /**
   * GET /api/organizations
   * 현재 사용자가 소속된 조직 목록을 페이지네이션으로 조회한다.
   */
  @Get()
  async findAll(
    @Query(new ZodValidationPipe(QueryOrganizationSchema))
    query: QueryOrganizationDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.organizationService.getOrganizationsByUserId(
      user.id,
      query.page,
      query.pageSize
    );
  }

  /**
   * GET /api/organizations/:id
   * 단일 조직 정보를 조회한다.
   * OrgRoleGuard를 통해 해당 조직의 멤버만 접근 가능하다.
   */
  @Get(':id')
  @UseGuards(OrgRoleGuard)
  async findOne(@Param('id') id: string) {
    return this.organizationService.getOrganization(id);
  }

  /**
   * PATCH /api/organizations/:id
   * 조직 정보를 부분 업데이트한다.
   * Owner 또는 Admin만 수정 가능하다.
   */
  @Patch(':id')
  @UseGuards(OrgRoleGuard)
  @OrgRoles('OWNER' as const, 'ADMIN' as const)
  @UsePipes(new ZodValidationPipe(UpdateOrganizationSchema))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.organizationService.updateOrganization(
      id,
      dto,
      user.id,
      req.ip
    );
  }

  /**
   * DELETE /api/organizations/:id
   * 조직을 삭제한다. Cascade로 하위 Membership, Invite도 함께 삭제된다.
   * Owner만 삭제 가능하다.
   */
  @Delete(':id')
  @UseGuards(OrgRoleGuard)
  @OrgRoles('OWNER' as const)
  async remove(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.organizationService.deleteOrganization(id, user.id, req.ip);
  }

  /**
   * GET /api/organizations/:id/monthly-response-count
   * 해당 조직의 현재 Billing Period 기준 월간 응답 수를 조회한다.
   * 조직 멤버만 접근 가능하다.
   * TODO: Survey/Response 모델 추가 후 실제 집계 구현 필요
   */
  @Get(':id/monthly-response-count')
  @UseGuards(OrgRoleGuard)
  async getMonthlyResponseCount(@Param('id') id: string) {
    const count = await this.organizationService.getMonthlyResponseCount(id);
    return { count };
  }
}
