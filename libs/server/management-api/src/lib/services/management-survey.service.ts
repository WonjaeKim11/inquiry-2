import { Injectable } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { ResourceNotFoundException } from '@inquiry/server-core';

/**
 * Management API Survey CRUD 서비스.
 * 환경(Environment) 단위로 설문 조사를 관리한다.
 */
@Injectable()
export class ManagementSurveyService {
  constructor(private readonly prisma: ServerPrismaService) {}

  /**
   * 환경별 설문 목록 조회.
   * 최신순으로 정렬하여 반환한다.
   * @param environmentId - 대상 환경 ID
   */
  async list(environmentId: string) {
    return this.prisma.survey.findMany({
      where: { environmentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 설문 생성.
   * @param environmentId - 설문이 속할 환경 ID
   * @param input - 설문 생성 데이터 (name 필수, questions/status 선택)
   */
  async create(
    environmentId: string,
    input: { name: string; questions?: unknown; status?: string }
  ) {
    return this.prisma.survey.create({
      data: {
        environmentId,
        name: input.name,
        ...(input.questions !== undefined && {
          questions: input.questions as any,
        }),
        ...(input.status !== undefined && { status: input.status as any }),
      },
    });
  }

  /**
   * 설문 단건 조회.
   * 응답(responses)과 노출(displays) ID 목록을 함께 반환한다.
   * @param environmentId - 대상 환경 ID (소유권 검증용)
   * @param surveyId - 조회 대상 설문 ID
   * @throws ResourceNotFoundException - 해당 환경에 설문이 없을 때
   */
  async findById(environmentId: string, surveyId: string) {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, environmentId },
      include: {
        responses: { select: { id: true } },
        displays: { select: { id: true } },
      },
    });

    if (!survey) {
      throw new ResourceNotFoundException('Survey', surveyId);
    }

    return survey;
  }

  /**
   * 설문 수정.
   * 전달된 필드만 업데이트한다 (partial update).
   * @param environmentId - 대상 환경 ID (소유권 검증용)
   * @param surveyId - 수정 대상 설문 ID
   * @param input - 수정할 필드들
   * @throws ResourceNotFoundException - 해당 환경에 설문이 없을 때
   */
  async update(
    environmentId: string,
    surveyId: string,
    input: { name?: string; questions?: unknown; status?: string }
  ) {
    // 해당 환경에 속한 설문인지 확인
    const existing = await this.prisma.survey.findFirst({
      where: { id: surveyId, environmentId },
    });

    if (!existing) {
      throw new ResourceNotFoundException('Survey', surveyId);
    }

    return this.prisma.survey.update({
      where: { id: surveyId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.questions !== undefined && {
          questions: input.questions as any,
        }),
        ...(input.status !== undefined && { status: input.status as any }),
      },
    });
  }

  /**
   * 설문 삭제.
   * @param environmentId - 대상 환경 ID (소유권 검증용)
   * @param surveyId - 삭제 대상 설문 ID
   * @throws ResourceNotFoundException - 해당 환경에 설문이 없을 때
   */
  async remove(environmentId: string, surveyId: string) {
    // 해당 환경에 속한 설문인지 확인
    const existing = await this.prisma.survey.findFirst({
      where: { id: surveyId, environmentId },
    });

    if (!existing) {
      throw new ResourceNotFoundException('Survey', surveyId);
    }

    await this.prisma.survey.delete({ where: { id: surveyId } });
  }
}
