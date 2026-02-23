import { Injectable } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';

/**
 * Client API 환경 서비스.
 * 환경 상태와 활성 설문 목록을 조회한다.
 */
@Injectable()
export class ClientEnvironmentService {
  constructor(private readonly prisma: ServerPrismaService) {}

  /**
   * 환경 상태 + 활성 설문 조회.
   * 프로젝트 설정, 액션 클래스, 진행 중인 설문을 포함한다.
   * @param environmentId - 대상 환경 ID
   */
  async getEnvironmentState(environmentId: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            recontactDays: true,
            placement: true,
            clickOutsideClose: true,
            darkOverlay: true,
            styling: true,
            logo: true,
          },
        },
        actionClasses: {
          select: { id: true, name: true, type: true, key: true },
        },
        surveys: {
          where: { status: 'IN_PROGRESS' },
          select: {
            id: true,
            name: true,
            questions: true,
            status: true,
          },
        },
      },
    });

    return {
      data: {
        ...environment,
      },
    };
  }
}
