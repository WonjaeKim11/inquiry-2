import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditLogService } from '@inquiry/server-audit-log';
import { EmailService } from '@inquiry/server-email';
import type { CreateInviteDto } from './dto/create-invite.dto.js';

/** 초대 JWT 토큰의 페이로드 */
interface InviteTokenPayload {
  sub: string; // inviteId
  email: string;
  organizationId: string;
  purpose: 'invite';
}

/** 초대 수락 결과 */
interface AcceptInviteResult {
  organizationId: string;
  organizationName: string;
  role: string;
}

/**
 * 초대 서비스.
 * 초대 생성, 목록 조회, 재발송, 삭제, 수락 등의 비즈니스 로직을 담당한다.
 * 초대 토큰은 JWT 형식으로, JWT_INVITE_SECRET으로 서명하고 'purpose: invite' 클레임으로 구분한다.
 */
@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name);

  /** 초대 만료 기간: 7일 (밀리초) */
  private readonly INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
    private readonly emailService: EmailService
  ) {}

  /**
   * 초대를 생성한다.
   * 1. 초대 기능 활성화 여부 확인
   * 2. 권한 검증 (역할에 따른 초대 가능 범위)
   * 3. 중복 초대 및 기존 멤버 검증
   * 4. teamIds 유효성 검증
   * 5. Invite 레코드 생성 + JWT 토큰 발행
   * 6. 이메일 발송 (fire-and-forget)
   * 7. 감사 로그 기록
   *
   * @param userId - 초대 생성자 사용자 ID
   * @param dto - 초대 생성 데이터
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async createInvite(userId: string, dto: CreateInviteDto, ipAddress?: string) {
    // 1. 초대 기능 비활성화 확인
    const inviteDisabled =
      this.configService.get<string>('INVITE_DISABLED', 'false') === 'true';
    if (inviteDisabled) {
      throw new ForbiddenException('초대 기능이 비활성화되어 있습니다.');
    }

    // 2. Self-hosted 환경에서 BILLING 역할 제한
    const isSelfHosted =
      this.configService.get<string>('IS_SELF_HOSTED', 'false') === 'true';
    if (isSelfHosted && dto.role === 'BILLING') {
      throw new BadRequestException(
        'Billing 역할은 Cloud 환경에서만 사용 가능합니다.'
      );
    }

    // 3. 생성자의 조직 멤버십 확인 및 권한 검증
    const creatorMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: dto.organizationId,
        },
      },
      select: { role: true },
    });

    if (!creatorMembership) {
      throw new ForbiddenException('이 조직의 멤버가 아닙니다.');
    }

    // ADMIN(=Manager)은 MEMBER 역할로만 초대 가능
    if (creatorMembership.role === 'ADMIN' && dto.role !== 'MEMBER') {
      throw new ForbiddenException(
        'Manager는 Member 역할로만 초대할 수 있습니다.'
      );
    }

    // MEMBER, BILLING 역할은 초대 불가
    if (
      creatorMembership.role === 'MEMBER' ||
      creatorMembership.role === 'BILLING'
    ) {
      throw new ForbiddenException('초대 권한이 없습니다.');
    }

    // 4. License 기반 역할 관리 제한 (OWNER 외 역할 할당 시)
    if (dto.role !== 'MEMBER') {
      const roleManagementEnabled =
        this.configService.get<string>('ROLE_MANAGEMENT_ENABLED', 'false') ===
        'true';
      if (!roleManagementEnabled && creatorMembership.role !== 'OWNER') {
        throw new ForbiddenException(
          '역할 관리 기능을 사용하려면 Enterprise 라이선스가 필요합니다.'
        );
      }
    }

    // 5. 중복 초대 검증 (같은 이메일 + 같은 조직)
    const existingInvite = await this.prisma.invite.findFirst({
      where: {
        email: dto.email,
        organizationId: dto.organizationId,
      },
    });

    if (existingInvite) {
      throw new ConflictException('이미 초대가 발송된 이메일입니다.');
    }

    // 6. 이미 멤버인지 확인
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existingUser) {
      const existingMembership = await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: dto.organizationId,
          },
        },
      });

      if (existingMembership) {
        throw new ConflictException('이미 조직에 속한 멤버입니다.');
      }
    }

    // 7. teamIds 유효성 검증: 해당 조직에 속한 팀인지 확인
    if (dto.teamIds.length > 0) {
      // 중복 제거
      const uniqueTeamIds = [...new Set(dto.teamIds)];
      if (uniqueTeamIds.length !== dto.teamIds.length) {
        throw new BadRequestException('중복된 팀이 선택되었습니다.');
      }

      const teams = await this.prisma.team.findMany({
        where: {
          id: { in: uniqueTeamIds },
          organizationId: dto.organizationId,
        },
        select: { id: true },
      });

      if (teams.length !== uniqueTeamIds.length) {
        throw new BadRequestException('존재하지 않는 팀이 포함되어 있습니다.');
      }
    }

    // 8. Invite 레코드 생성
    const expiresAt = new Date(Date.now() + this.INVITE_TTL_MS);
    const invite = await this.prisma.invite.create({
      data: {
        email: dto.email,
        name: dto.name,
        organizationId: dto.organizationId,
        creatorId: userId,
        role: dto.role,
        teamIds: dto.teamIds,
        token: '', // JWT 토큰은 생성 후 업데이트
        expiresAt,
      },
    });

    // 9. JWT 초대 토큰 생성 후 업데이트
    const token = this.generateInviteToken(
      invite.id,
      dto.email,
      dto.organizationId
    );

    const updatedInvite = await this.prisma.invite.update({
      where: { id: invite.id },
      data: { token },
    });

    // 10. 이메일 발송 (fire-and-forget)
    this.sendInviteEmail(dto.email, dto.name, token, dto.organizationId).catch(
      (error) => {
        this.logger.error('초대 이메일 발송 실패', error);
      }
    );

    // 11. 감사 로그 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'invite.created',
      userId,
      targetType: 'invite',
      targetId: invite.id,
      organizationId: dto.organizationId,
      ipAddress,
      metadata: {
        email: dto.email,
        role: dto.role,
        teamIds: dto.teamIds,
      },
    });

    this.logger.debug(
      `초대 생성 완료: ${invite.id} (${dto.email} -> ${dto.organizationId})`
    );

    return {
      id: updatedInvite.id,
      email: updatedInvite.email,
      name: updatedInvite.name,
      role: updatedInvite.role,
      teamIds: updatedInvite.teamIds,
      expiresAt: updatedInvite.expiresAt,
      createdAt: updatedInvite.createdAt,
    };
  }

  /**
   * 조직의 초대 목록을 조회한다.
   *
   * @param organizationId - 조직 ID
   */
  async getInvitesByOrganization(organizationId: string) {
    return this.prisma.invite.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamIds: true,
        expiresAt: true,
        createdAt: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 초대를 재발송한다.
   * 만료 시간을 갱신하고, 새 JWT 토큰을 생성하여 이메일을 재발송한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param inviteId - 재발송할 초대 ID
   * @param organizationId - 조직 ID
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async resendInvite(
    userId: string,
    inviteId: string,
    organizationId: string,
    ipAddress?: string
  ) {
    const invite = await this.prisma.invite.findFirst({
      where: { id: inviteId, organizationId },
    });

    if (!invite) {
      throw new NotFoundException('초대를 찾을 수 없습니다.');
    }

    // 새 만료 시간 + 새 JWT 토큰 생성
    const expiresAt = new Date(Date.now() + this.INVITE_TTL_MS);
    const token = this.generateInviteToken(
      invite.id,
      invite.email,
      invite.organizationId
    );

    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { token, expiresAt },
    });

    // 이메일 재발송 (fire-and-forget)
    this.sendInviteEmail(
      invite.email,
      invite.name,
      token,
      invite.organizationId
    ).catch((error) => {
      this.logger.error('초대 이메일 재발송 실패', error);
    });

    // 감사 로그 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'invite.resent',
      userId,
      targetType: 'invite',
      targetId: invite.id,
      organizationId,
      ipAddress,
      metadata: { email: invite.email },
    });

    this.logger.debug(`초대 재발송 완료: ${invite.id}`);
  }

  /**
   * 초대를 삭제한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param inviteId - 삭제할 초대 ID
   * @param organizationId - 조직 ID
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async deleteInvite(
    userId: string,
    inviteId: string,
    organizationId: string,
    ipAddress?: string
  ) {
    const invite = await this.prisma.invite.findFirst({
      where: { id: inviteId, organizationId },
    });

    if (!invite) {
      throw new NotFoundException('초대를 찾을 수 없습니다.');
    }

    await this.prisma.invite.delete({ where: { id: invite.id } });

    // 감사 로그 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'invite.deleted',
      userId,
      targetType: 'invite',
      targetId: invite.id,
      organizationId,
      ipAddress,
      metadata: { email: invite.email },
    });

    this.logger.debug(`초대 삭제 완료: ${invite.id}`);
  }

  /**
   * 초대를 수락한다.
   * JWT 토큰을 검증하고 트랜잭션으로 Membership + TeamUser 생성 + Invite 삭제를 처리한다.
   *
   * @param token - JWT 초대 토큰
   * @param userId - 수락하는 사용자 ID (인증된 경우)
   */
  async acceptInvite(
    token: string,
    userId?: string
  ): Promise<AcceptInviteResult> {
    // 1. JWT 토큰 검증
    let payload: InviteTokenPayload;
    try {
      const secret = this.configService.get<string>(
        'JWT_INVITE_SECRET',
        this.configService.getOrThrow<string>('JWT_ACCESS_SECRET')
      );
      payload = this.jwtService.verify(token, { secret });
    } catch {
      throw new BadRequestException('유효하지 않거나 만료된 초대 토큰입니다.');
    }

    // purpose 확인: 인증 JWT와의 혼용 방지
    if (payload.purpose !== 'invite') {
      throw new BadRequestException('유효하지 않은 초대 토큰입니다.');
    }

    // 2. Invite 레코드 조회
    const invite = await this.prisma.invite.findUnique({
      where: { id: payload.sub },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    if (!invite) {
      throw new NotFoundException('이미 수락되었거나 삭제된 초대입니다.');
    }

    // 만료 확인
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException(
        '초대가 만료되었습니다. 관리자에게 재초대를 요청해주세요.'
      );
    }

    // 3. 수락 사용자 결정: userId가 있으면 사용, 없으면 이메일로 검색
    let acceptorId = userId;
    if (!acceptorId) {
      const user = await this.prisma.user.findUnique({
        where: { email: invite.email },
        select: { id: true },
      });
      if (!user) {
        throw new BadRequestException(
          '이 이메일로 가입된 사용자가 없습니다. 먼저 회원가입해주세요.'
        );
      }
      acceptorId = user.id;
    }

    // 이미 멤버인지 확인
    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: acceptorId,
          organizationId: invite.organizationId,
        },
      },
    });

    if (existingMembership) {
      // 이미 멤버이면 초대만 삭제하고 성공 반환
      await this.prisma.invite.delete({ where: { id: invite.id } });
      return {
        organizationId: invite.organizationId,
        organizationName: invite.organization.name,
        role: existingMembership.role,
      };
    }

    // 4. 트랜잭션: Membership 생성 + TeamUser 생성 + Invite 삭제
    const transactionOps = [];

    // Membership 생성
    transactionOps.push(
      this.prisma.membership.create({
        data: {
          userId: acceptorId,
          organizationId: invite.organizationId,
          role: invite.role,
        },
      })
    );

    // TeamUser 생성 (teamIds가 있는 경우)
    if (invite.teamIds.length > 0) {
      for (const teamId of invite.teamIds) {
        transactionOps.push(
          this.prisma.teamUser.create({
            data: {
              teamId,
              userId: acceptorId,
              role: 'CONTRIBUTOR',
            },
          })
        );
      }
    }

    // Invite 삭제
    transactionOps.push(
      this.prisma.invite.delete({ where: { id: invite.id } })
    );

    await this.prisma.$transaction(transactionOps);

    // 5. 수락 알림 이메일 발송 (fire-and-forget, 초대 생성자에게)
    this.sendAcceptNotification(
      invite.creatorId,
      invite.email,
      invite.organization.name
    ).catch((error) => {
      this.logger.error('초대 수락 알림 이메일 발송 실패', error);
    });

    // 6. 감사 로그 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'invite.accepted',
      userId: acceptorId,
      targetType: 'invite',
      targetId: invite.id,
      organizationId: invite.organizationId,
      metadata: {
        email: invite.email,
        role: invite.role,
      },
    });

    this.logger.debug(
      `초대 수락 완료: ${invite.id} (${invite.email} -> ${invite.organizationId})`
    );

    return {
      organizationId: invite.organizationId,
      organizationName: invite.organization.name,
      role: invite.role,
    };
  }

  /**
   * 초대 JWT 토큰을 생성한다.
   * purpose 클레임으로 인증 JWT와 구분한다.
   * JWT_INVITE_SECRET을 우선 사용하고, 없으면 JWT_ACCESS_SECRET을 fallback으로 사용.
   *
   * @param inviteId - 초대 ID (sub 클레임)
   * @param email - 초대 대상 이메일
   * @param organizationId - 조직 ID
   */
  private generateInviteToken(
    inviteId: string,
    email: string,
    organizationId: string
  ): string {
    const secret = this.configService.get<string>(
      'JWT_INVITE_SECRET',
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET')
    );

    return this.jwtService.sign(
      {
        sub: inviteId,
        email,
        organizationId,
        purpose: 'invite',
      },
      {
        secret,
        expiresIn: '7d',
      }
    );
  }

  /**
   * 초대 이메일을 발송한다.
   * EmailService의 sendInviteEmail 메서드를 사용한다.
   */
  private async sendInviteEmail(
    email: string,
    name: string | null | undefined,
    token: string,
    organizationId: string
  ): Promise<void> {
    // 조직 이름 조회
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    await this.emailService.sendInviteEmail(
      email,
      name ?? undefined,
      token,
      org?.name ?? '조직'
    );
  }

  /**
   * 초대 수락 알림 이메일을 발송한다.
   * 초대 생성자에게 수락 사실을 알린다.
   */
  private async sendAcceptNotification(
    creatorId: string,
    acceptorEmail: string,
    organizationName: string
  ): Promise<void> {
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      select: { email: true, name: true },
    });

    if (creator) {
      await this.emailService.sendInviteAcceptedNotification(
        creator.email,
        creator.name,
        acceptorEmail,
        organizationName
      );
    }
  }
}
