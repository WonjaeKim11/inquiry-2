import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';

/**
 * 환경 서비스.
 * Environment 조회 비즈니스 로직을 담당한다.
 * Environment는 Project 생성 시 자동으로 생성되므로, 별도 생성/삭제 API는 제공하지 않는다.
 */
@Injectable()
export class EnvironmentService {
  private readonly logger = new Logger(EnvironmentService.name);

  constructor(private readonly prisma: ServerPrismaService) {}

  /**
   * 프로젝트에 속한 환경 목록을 조회한다.
   * 조직 멤버만 조회 가능하다.
   *
   * @param userId - 요청자 사용자 ID
   * @param projectId - 프로젝트 ID
   */
  async getEnvironmentsByProject(userId: string, projectId: string) {
    // 프로젝트 존재 확인 및 조직 멤버십 검증
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    }

    await this.validateOrgMembership(userId, project.organizationId);

    return this.prisma.environment.findMany({
      where: { projectId },
      include: {
        _count: { select: { actionClasses: true } },
      },
      orderBy: { type: 'asc' },
    });
  }

  /**
   * 단일 환경을 ID로 조회한다.
   * 조직 멤버만 조회 가능하다.
   *
   * @param userId - 요청자 사용자 ID
   * @param environmentId - 환경 ID
   */
  async getEnvironment(userId: string, environmentId: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          select: { organizationId: true },
        },
        actionClasses: true,
      },
    });

    if (!environment) {
      throw new NotFoundException('환경을 찾을 수 없습니다.');
    }

    // 조직 멤버십 확인
    await this.validateOrgMembership(
      userId,
      environment.project.organizationId
    );

    return environment;
  }

  /**
   * 환경 ID로 소속 조직 ID를 반환한다.
   * 다른 서비스에서 권한 확인 시 사용된다.
   *
   * @param environmentId - 환경 ID
   */
  async getOrganizationIdByEnvironment(environmentId: string): Promise<string> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: { select: { organizationId: true } },
      },
    });

    if (!environment) {
      throw new NotFoundException('환경을 찾을 수 없습니다.');
    }

    return environment.project.organizationId;
  }

  /**
   * 사용자가 해당 조직의 멤버인지 확인한다.
   */
  private async validateOrgMembership(
    userId: string,
    organizationId: string
  ): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId },
      },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('이 조직의 멤버가 아닙니다.');
    }
  }
}
