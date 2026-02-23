import {
  Controller,
  Post,
  Get,
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
import { RbacGuard, AccessRules } from '@inquiry/server-rbac';
import { InviteService } from './invite.service.js';
import { CreateInviteSchema } from './dto/create-invite.dto.js';
import type { CreateInviteDto } from './dto/create-invite.dto.js';
import { AcceptInviteSchema } from './dto/accept-invite.dto.js';
import type { AcceptInviteDto } from './dto/accept-invite.dto.js';

/** JWT에서 추출한 인증된 사용자 정보 */
interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * 초대 컨트롤러.
 * 초대 생성, 목록 조회, 재발송, 삭제, 수락 API를 제공한다.
 */
@Controller('invites')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  /**
   * POST /api/invites
   * 초대를 생성한다.
   * Owner, Admin만 초대 생성 가능 (Admin은 MEMBER 역할만).
   */
  @Post()
  @UseGuards(AuthGuard('jwt'), RbacGuard)
  @AccessRules({
    type: 'organization',
    allowedRoles: ['OWNER', 'ADMIN'],
  })
  @UsePipes(new ZodValidationPipe(CreateInviteSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateInviteDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.inviteService.createInvite(user.id, dto, req.ip);
  }

  /**
   * GET /api/invites?organizationId=xxx
   * 조직의 초대 목록을 조회한다.
   * Owner, Admin만 조회 가능.
   */
  @Get()
  @UseGuards(AuthGuard('jwt'), RbacGuard)
  @AccessRules({
    type: 'organization',
    allowedRoles: ['OWNER', 'ADMIN'],
  })
  async findAll(@Query('organizationId') organizationId: string) {
    if (!organizationId) {
      return [];
    }
    return this.inviteService.getInvitesByOrganization(organizationId);
  }

  /**
   * POST /api/invites/:inviteId/resend
   * 초대를 재발송한다.
   * Owner, Admin만 재발송 가능.
   */
  @Post(':inviteId/resend')
  @UseGuards(AuthGuard('jwt'), RbacGuard)
  @AccessRules({
    type: 'organization',
    allowedRoles: ['OWNER', 'ADMIN'],
  })
  @HttpCode(HttpStatus.OK)
  async resend(
    @Param('inviteId') inviteId: string,
    @Query('organizationId') organizationId: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    await this.inviteService.resendInvite(
      user.id,
      inviteId,
      organizationId,
      req.ip
    );
    return { success: true };
  }

  /**
   * DELETE /api/invites/:inviteId?organizationId=xxx
   * 초대를 삭제한다.
   * Owner, Admin만 삭제 가능.
   */
  @Delete(':inviteId')
  @UseGuards(AuthGuard('jwt'), RbacGuard)
  @AccessRules({
    type: 'organization',
    allowedRoles: ['OWNER', 'ADMIN'],
  })
  async remove(
    @Param('inviteId') inviteId: string,
    @Query('organizationId') organizationId: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    await this.inviteService.deleteInvite(
      user.id,
      inviteId,
      organizationId,
      req.ip
    );
    return { success: true };
  }

  /**
   * POST /api/invites/accept
   * 초대를 수락한다.
   * JWT 초대 토큰으로 인증하므로 별도 인증 가드 없음.
   * 로그인 상태라면 해당 사용자로, 아니면 이메일로 사용자를 찾는다.
   */
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @Body(new ZodValidationPipe(AcceptInviteSchema)) dto: AcceptInviteDto,
    @Req() req: Request
  ) {
    // 로그인 상태라면 사용자 ID 전달
    const user = req.user as AuthenticatedUser | undefined;
    return this.inviteService.acceptInvite(dto.token, user?.id);
  }
}
