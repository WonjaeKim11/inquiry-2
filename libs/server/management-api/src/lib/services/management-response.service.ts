import { Injectable } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { ResourceNotFoundException } from '@inquiry/server-core';

/**
 * Management API Response CRUD 서비스.
 * 환경(Environment) 단위로 설문 응답을 관리한다.
 */
@Injectable()
export class ManagementResponseService {
  constructor(private readonly prisma: ServerPrismaService) {}

  /**
   * 환경별 응답 목록 조회.
   * 최신순으로 정렬하여 반환한다.
   * @param environmentId - 대상 환경 ID
   */
  async list(environmentId: string) {
    return this.prisma.response.findMany({
      where: { environmentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 응답 단건 조회.
   * @param environmentId - 대상 환경 ID (소유권 검증용)
   * @param responseId - 조회 대상 응답 ID
   * @throws ResourceNotFoundException - 해당 환경에 응답이 없을 때
   */
  async findById(environmentId: string, responseId: string) {
    const response = await this.prisma.response.findFirst({
      where: { id: responseId, environmentId },
    });

    if (!response) {
      throw new ResourceNotFoundException('Response', responseId);
    }

    return response;
  }

  /**
   * 응답 수정.
   * 전달된 필드만 업데이트한다 (partial update).
   * @param environmentId - 대상 환경 ID (소유권 검증용)
   * @param responseId - 수정 대상 응답 ID
   * @param input - 수정할 필드들
   * @throws ResourceNotFoundException - 해당 환경에 응답이 없을 때
   */
  async update(
    environmentId: string,
    responseId: string,
    input: {
      data?: Record<string, unknown>;
      finished?: boolean;
      meta?: Record<string, unknown>;
      language?: string;
      variables?: Record<string, unknown>;
      ttc?: Record<string, unknown>;
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
        ...(input.variables !== undefined && { variables: input.variables }),
        ...(input.ttc !== undefined && { ttc: input.ttc }),
        ...(input.hiddenFields !== undefined && {
          hiddenFields: input.hiddenFields,
        }),
        ...(input.endingId !== undefined && { endingId: input.endingId }),
      },
    });
  }

  /**
   * 응답 삭제.
   * @param environmentId - 대상 환경 ID (소유권 검증용)
   * @param responseId - 삭제 대상 응답 ID
   * @throws ResourceNotFoundException - 해당 환경에 응답이 없을 때
   */
  async remove(environmentId: string, responseId: string) {
    // 해당 환경에 속한 응답인지 확인
    const existing = await this.prisma.response.findFirst({
      where: { id: responseId, environmentId },
    });

    if (!existing) {
      throw new ResourceNotFoundException('Response', responseId);
    }

    await this.prisma.response.delete({ where: { id: responseId } });
  }
}
