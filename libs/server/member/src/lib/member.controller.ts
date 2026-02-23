import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ZodValidationPipe } from '@inquiry/server-core';
import { RbacGuard, AccessRules } from '@inquiry/server-rbac';
import { MemberService } from './member.service.js';
import { UpdateMemberRoleSchema } from './dto/update-member-role.dto.js';
import type { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';

/** JWT에서 추출한 인증된 사용자 정보 */
interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * 멤버 컨트롤러.
 * 조직 멤버 목록 조회, 역할 변경, 멤버 삭제 API를 제공한다.
 * 모든 엔드포인트는 JWT 인증이 필수이다.
 */
@Controller('organizations/:orgId/members')
@UseGuards(AuthGuard('jwt'))
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  /**
   * GET /api/organizations/:orgId/members
   * 조직의 멤버 목록을 조회한다.
   * 해당 조직의 멤버라면 누구나 조회 가능.
   */
  @Get()
  @UseGuards(RbacGuard)
  @AccessRules({
    type: 'organization',
    organizationIdParam: 'orgId',
    allowedRoles: ['OWNER', 'ADMIN', 'MEMBER', 'BILLING'],
  })
  async findAll(@Param('orgId') orgId: string) {
    return this.memberService.getMembers(orgId);
  }

  /**
   * PATCH /api/organizations/:orgId/members/:userId/role
   * 멤버의 역할을 변경한다.
   * Owner: 모든 역할 변경 가능
   * Admin(Manager): MEMBER 역할만 변경 가능
   */
  @Patch(':userId/role')
  @UseGuards(RbacGuard)
  @AccessRules({
    type: 'organization',
    organizationIdParam: 'orgId',
    allowedRoles: ['OWNER', 'ADMIN'],
  })
  async updateRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(UpdateMemberRoleSchema))
    dto: UpdateMemberRoleDto,
    @Req() req: Request
  ) {
    const currentUser = req.user as AuthenticatedUser;
    return this.memberService.updateMemberRole(
      currentUser.id,
      orgId,
      userId,
      dto.role,
      req.ip
    );
  }

  /**
   * DELETE /api/organizations/:orgId/members/:userId
   * 멤버를 조직에서 삭제한다.
   * Owner, Admin만 삭제 가능.
   */
  @Delete(':userId')
  @UseGuards(RbacGuard)
  @AccessRules({
    type: 'organization',
    organizationIdParam: 'orgId',
    allowedRoles: ['OWNER', 'ADMIN'],
  })
  async remove(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Req() req: Request
  ) {
    const currentUser = req.user as AuthenticatedUser;
    await this.memberService.deleteMember(
      currentUser.id,
      orgId,
      userId,
      req.ip
    );
    return { success: true };
  }
}

/**
 * 조직 탈퇴 컨트롤러.
 * POST /api/organizations/:orgId/leave 엔드포인트를 제공한다.
 * 멤버 컨트롤러와 별도로 정의하여 올바른 라우트 경로를 보장한다.
 */
@Controller('organizations/:orgId')
@UseGuards(AuthGuard('jwt'))
export class OrganizationLeaveController {
  constructor(private readonly memberService: MemberService) {}

  /**
   * POST /api/organizations/:orgId/leave
   * 조직을 탈퇴한다.
   * Owner를 제외한 모든 멤버가 탈퇴 가능.
   */
  @Post('leave')
  @HttpCode(HttpStatus.OK)
  async leave(@Param('orgId') orgId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    await this.memberService.leaveOrganization(user.id, orgId, req.ip);
    return { success: true };
  }
}
