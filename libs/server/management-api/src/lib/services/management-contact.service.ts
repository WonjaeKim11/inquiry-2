import { Injectable } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { ResourceNotFoundException } from '@inquiry/server-core';

/**
 * Management API Contact CRUD 서비스.
 * 환경(Environment) 단위로 연락처를 관리한다.
 */
@Injectable()
export class ManagementContactService {
  constructor(private readonly prisma: ServerPrismaService) {}

  /**
   * 환경별 연락처 목록 조회.
   * 최신순으로 정렬하여 반환한다.
   * @param environmentId - 대상 환경 ID
   */
  async list(environmentId: string) {
    return this.prisma.contact.findMany({
      where: { environmentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 연락처 생성.
   * @param environmentId - 연락처가 속할 환경 ID
   * @param input - 연락처 생성 데이터 (attributes 선택)
   */
  async create(
    environmentId: string,
    input: { attributes?: Record<string, unknown> }
  ) {
    return this.prisma.contact.create({
      data: {
        environmentId,
        ...(input.attributes && { attributes: input.attributes }),
      },
    });
  }

  /**
   * 연락처 단건 조회.
   * 해당 연락처의 응답 요약 정보를 함께 반환한다.
   * @param environmentId - 대상 환경 ID (소유권 검증용)
   * @param contactId - 조회 대상 연락처 ID
   * @throws ResourceNotFoundException - 해당 환경에 연락처가 없을 때
   */
  async findById(environmentId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, environmentId },
      include: {
        responses: {
          select: { id: true, surveyId: true, finished: true },
        },
      },
    });

    if (!contact) {
      throw new ResourceNotFoundException('Contact', contactId);
    }

    return contact;
  }

  /**
   * 연락처 삭제.
   * @param environmentId - 대상 환경 ID (소유권 검증용)
   * @param contactId - 삭제 대상 연락처 ID
   * @throws ResourceNotFoundException - 해당 환경에 연락처가 없을 때
   */
  async remove(environmentId: string, contactId: string) {
    // 해당 환경에 속한 연락처인지 확인
    const existing = await this.prisma.contact.findFirst({
      where: { id: contactId, environmentId },
    });

    if (!existing) {
      throw new ResourceNotFoundException('Contact', contactId);
    }

    await this.prisma.contact.delete({ where: { id: contactId } });
  }
}
