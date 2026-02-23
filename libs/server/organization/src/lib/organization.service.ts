import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditLogService } from '@inquiry/server-audit-log';
import type { CreateOrganizationDto } from './dto/create-organization.dto.js';
import type { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { DEFAULT_BILLING, PLAN_LIMITS } from './constants/billing.constants.js';
import type {
  OrganizationBilling,
  OrganizationWhitelabel,
  PaginatedOrganizations,
} from './types/organization.types.js';

/**
 * 조직 서비스.
 * 조직 CRUD, Billing 관리, 월간 응답 수 조회 등의 비즈니스 로직을 담당한다.
 */
@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService
  ) {}

  /**
   * 새 조직을 생성한다.
   * Multi-Org가 비활성화된 경우, 사용자가 이미 Owner인 조직이 있으면 생성을 차단한다.
   * 생성자는 자동으로 OWNER 역할의 멤버십을 부여받는다.
   *
   * @param userId - 생성자 사용자 ID
   * @param dto - 조직 생성 데이터
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async createOrganization(
    userId: string,
    dto: CreateOrganizationDto,
    ipAddress?: string
  ) {
    // Multi-Org 제어: 비활성화 시 이미 Owner인 조직이 있으면 차단
    const multiOrgEnabled =
      this.configService.get<string>('MULTI_ORG_ENABLED', 'true') === 'true';

    if (!multiOrgEnabled) {
      const existingOwnership = await this.prisma.membership.findFirst({
        where: { userId, role: 'OWNER' },
        select: { id: true },
      });

      if (existingOwnership) {
        throw new ForbiddenException(
          'Multi-Org 기능이 비활성화되어 추가 조직을 생성할 수 없습니다.'
        );
      }
    }

    // 조직 생성 + OWNER 멤버십 동시 생성 (트랜잭션)
    const organization = await this.prisma.organization.create({
      data: {
        ...(dto.id ? { id: dto.id } : {}),
        name: dto.name,
        billing: DEFAULT_BILLING as unknown as Record<string, unknown>,
        whitelabel: {},
        isAIEnabled: false,
        memberships: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
    });

    // 감사 로그 기록 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'org.created',
      userId,
      targetType: 'organization',
      targetId: organization.id,
      organizationId: organization.id,
      ipAddress,
      metadata: { name: dto.name },
    });

    this.logger.debug(`조직 생성 완료: ${organization.id} (user: ${userId})`);

    return organization;
  }

  /**
   * 사용자가 소속된 조직 목록을 페이지네이션으로 조회한다.
   *
   * @param userId - 사용자 ID
   * @param page - 페이지 번호 (1부터)
   * @param pageSize - 페이지 크기
   */
  async getOrganizationsByUserId(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedOrganizations> {
    const skip = (page - 1) * pageSize;

    // 총 개수와 데이터를 병렬로 조회
    const [total, memberships] = await Promise.all([
      this.prisma.membership.count({ where: { userId } }),
      this.prisma.membership.findMany({
        where: { userId },
        include: { organization: true },
        skip,
        take: pageSize,
        orderBy: { organization: { createdAt: 'desc' } },
      }),
    ]);

    const data = memberships.map((m) => m.organization);
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: data as unknown as PaginatedOrganizations['data'],
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  /**
   * 단일 조직을 ID로 조회한다.
   * 존재하지 않으면 NotFoundException을 던진다.
   *
   * @param organizationId - 조직 ID
   */
  async getOrganization(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('조직을 찾을 수 없습니다.');
    }

    return organization;
  }

  /**
   * 조직 정보를 부분 업데이트한다.
   * Billing JSON은 기존 값과 병합(deep merge)하여 저장한다.
   *
   * @param organizationId - 조직 ID
   * @param dto - 업데이트할 데이터 (부분 업데이트)
   * @param userId - 요청자 사용자 ID (감사 로그용)
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async updateOrganization(
    organizationId: string,
    dto: UpdateOrganizationDto,
    userId?: string,
    ipAddress?: string
  ) {
    const existing = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!existing) {
      throw new NotFoundException('조직을 찾을 수 없습니다.');
    }

    // 업데이트 데이터 구성
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      updateData['name'] = dto.name;
    }

    if (dto.isAIEnabled !== undefined) {
      updateData['isAIEnabled'] = dto.isAIEnabled;
    }

    // Billing: 기존 값과 병합 (deep merge)
    if (dto.billing !== undefined) {
      const currentBilling = existing.billing as unknown as OrganizationBilling;
      const mergedBilling = this.mergeBilling(currentBilling, dto.billing);

      // Plan이 변경되었고 limits가 명시적으로 제공되지 않은 경우, 해당 Plan의 기본 limits 적용
      if (
        dto.billing.plan &&
        dto.billing.plan !== currentBilling.plan &&
        !dto.billing.limits
      ) {
        mergedBilling.limits = { ...PLAN_LIMITS[dto.billing.plan] };
      }

      updateData['billing'] = mergedBilling as unknown as Record<
        string,
        unknown
      >;
    }

    // Whitelabel: 기존 값과 병합
    if (dto.whitelabel !== undefined) {
      const currentWhitelabel =
        existing.whitelabel as unknown as OrganizationWhitelabel;
      updateData['whitelabel'] = {
        ...currentWhitelabel,
        ...dto.whitelabel,
      };
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    // 감사 로그 기록 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'org.updated',
      userId,
      targetType: 'organization',
      targetId: organizationId,
      organizationId,
      ipAddress,
      changes: {
        before: this.extractChangedFields(existing, updateData),
        after: this.extractChangedFields(updated, updateData),
      },
    });

    this.logger.debug(`조직 수정 완료: ${organizationId}`);

    return updated;
  }

  /**
   * 조직을 삭제한다.
   * Prisma onDelete: Cascade 설정에 의해 하위 Membership, Invite가 함께 삭제된다.
   *
   * @param organizationId - 삭제할 조직 ID
   * @param userId - 요청자 사용자 ID (감사 로그용)
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async deleteOrganization(
    organizationId: string,
    userId?: string,
    ipAddress?: string
  ): Promise<{ id: string }> {
    const existing = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!existing) {
      throw new NotFoundException('조직을 찾을 수 없습니다.');
    }

    await this.prisma.organization.delete({
      where: { id: organizationId },
    });

    // 감사 로그 기록 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'org.deleted',
      userId,
      targetType: 'organization',
      targetId: organizationId,
      organizationId,
      ipAddress,
      metadata: { name: existing.name },
    });

    this.logger.debug(`조직 삭제 완료: ${organizationId}`);

    return { id: organizationId };
  }

  /**
   * 월간 응답 수를 조회한다.
   * TODO: Survey/Response 모델이 추가되면 실제 집계 쿼리로 교체 필요 (FSD-006, FSD-008)
   *
   * @param _organizationId - 조직 ID (현재 미사용)
   */
  async getMonthlyResponseCount(_organizationId: string): Promise<number> {
    // TODO: Project -> Survey -> Response 관계가 구현되면
    // billing.periodStart 기준으로 현재 월의 응답 수를 집계하는 쿼리로 교체
    // 예시:
    // const org = await this.prisma.organization.findUnique({
    //   where: { id: _organizationId },
    //   select: { billing: true },
    // });
    // const periodStart = (org?.billing as OrganizationBilling)?.periodStart;
    // return this.prisma.response.count({
    //   where: {
    //     survey: { project: { organizationId: _organizationId } },
    //     createdAt: { gte: periodStart ? new Date(periodStart) : startOfMonth },
    //   },
    // });
    return 0;
  }

  /**
   * 사용자가 Owner인 조직 목록을 조회한다.
   * Multi-Org 제어 시 사용된다.
   *
   * @param userId - 사용자 ID
   */
  async getOrganizationsWhereUserIsOwner(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId, role: 'OWNER' },
      include: { organization: true },
    });

    return memberships.map((m) => m.organization);
  }

  /**
   * Billing JSON을 deep merge한다.
   * 제공된 필드만 기존 값을 덮어쓴다.
   */
  private mergeBilling(
    current: OrganizationBilling,
    update: NonNullable<UpdateOrganizationDto['billing']>
  ): OrganizationBilling {
    return {
      plan: update.plan ?? current.plan,
      period: update.period ?? current.period,
      periodStart:
        update.periodStart !== undefined
          ? update.periodStart
          : current.periodStart,
      limits: update.limits
        ? {
            projects:
              update.limits.projects !== undefined
                ? update.limits.projects
                : current.limits.projects,
            monthlyResponses:
              update.limits.monthlyResponses !== undefined
                ? update.limits.monthlyResponses
                : current.limits.monthlyResponses,
            monthlyMIU:
              update.limits.monthlyMIU !== undefined
                ? update.limits.monthlyMIU
                : current.limits.monthlyMIU,
          }
        : current.limits,
      stripeCustomerId:
        update.stripeCustomerId !== undefined
          ? update.stripeCustomerId
          : current.stripeCustomerId,
    };
  }

  /**
   * 변경된 필드만 추출하여 감사 로그용 diff 객체를 생성한다.
   */
  private extractChangedFields(
    entity: Record<string, unknown>,
    updateData: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(updateData)) {
      result[key] = entity[key];
    }
    return result;
  }
}
