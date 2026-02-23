import { Injectable } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { ResourceNotFoundException } from '@inquiry/server-core';

/**
 * Client API Response 서비스.
 * 설문 응답을 생성하고 업데이트한다.
 */
@Injectable()
export class ClientResponseService {
  constructor(private readonly prisma: ServerPrismaService) {}

  /**
   * 응답 생성.
   * 클라이언트가 설문에 대한 새로운 응답을 제출할 때 호출된다.
   * @param environmentId - 대상 환경 ID
   * @param input - 응답 데이터 (surveyId, data, finished 등)
   */
  async createResponse(
    environmentId: string,
    input: {
      surveyId: string;
      data?: Record<string, unknown>;
      finished?: boolean;
      meta?: Record<string, unknown>;
      language?: string;
      displayId?: string;
      contactId?: string;
    }
  ) {
    return this.prisma.response.create({
      data: {
        environmentId,
        surveyId: input.surveyId,
        data: input.data ?? {},
        finished: input.finished ?? false,
        meta: input.meta,
        language: input.language,
        displayId: input.displayId,
        contactId: input.contactId,
      },
    });
  }

  /**
   * 응답 업데이트.
   * 기존 응답의 데이터를 갱신한다 (부분 응답 완료 등).
   * @param environmentId - 대상 환경 ID (소유권 검증용)
   * @param responseId - 업데이트 대상 응답 ID
   * @param input - 갱신할 필드들
   * @throws ResourceNotFoundException - 해당 환경에 응답이 존재하지 않을 때
   */
  async updateResponse(
    environmentId: string,
    responseId: string,
    input: {
      data?: Record<string, unknown>;
      finished?: boolean;
      meta?: Record<string, unknown>;
      language?: string;
      ttc?: Record<string, unknown>;
      variables?: Record<string, unknown>;
      hiddenFields?: Record<string, unknown>;
      endingId?: string;
    }
  ) {
    // 해당 환경에 속한 응답인지 확인
    const existing = await this.prisma.response.findFirst({
      where: { id: responseId, environmentId },
    });

    if (!existing) {
      throw new ResourceNotFoundException('Response', responseId);
    }

    return this.prisma.response.update({
      where: { id: responseId },
      data: {
        ...(input.data !== undefined && { data: input.data }),
        ...(input.finished !== undefined && { finished: input.finished }),
        ...(input.meta !== undefined && { meta: input.meta }),
        ...(input.language !== undefined && { language: input.language }),
        ...(input.ttc !== undefined && { ttc: input.ttc }),
        ...(input.variables !== undefined && { variables: input.variables }),
        ...(input.hiddenFields !== undefined && {
          hiddenFields: input.hiddenFields,
        }),
        ...(input.endingId !== undefined && { endingId: input.endingId }),
      },
    });
  }
}
