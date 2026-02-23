import { Module } from '@nestjs/common';
import {
  MemberController,
  OrganizationLeaveController,
} from './member.controller.js';
import { MemberService } from './member.service.js';

/**
 * 멤버 모듈.
 * 조직 멤버 목록 조회, 역할 변경, 멤버 삭제, 조직 탈퇴 엔드포인트를 제공한다.
 * 두 개의 컨트롤러를 등록한다:
 * - MemberController: /api/organizations/:orgId/members/* (멤버 CRUD)
 * - OrganizationLeaveController: /api/organizations/:orgId/leave (조직 탈퇴)
 * AuditLogModule, ServerPrismaModule, ConfigModule, RbacModule은 @Global()이므로 별도 import 불필요.
 */
@Module({
  controllers: [MemberController, OrganizationLeaveController],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
