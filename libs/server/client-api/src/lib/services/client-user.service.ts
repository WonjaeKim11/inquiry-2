import { Injectable } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';

/**
 * Client API User 서비스.
 * Contact upsert를 통해 사용자를 식별하고 속성을 업데이트한다.
 */
@Injectable()
export class ClientUserService {
  constructor(private readonly prisma: ServerPrismaService) {}

  /**
   * Contact upsert: userId로 기존 Contact을 찾거나 새로 생성한다.
   * userId는 attributes JSON 내에서 관리되며, 일치하는 Contact이 있으면 업데이트한다.
   * @param environmentId - 대상 환경 ID
   * @param input - userId와 선택적 attributes
   */
  async identifyUser(
    environmentId: string,
    input: {
      userId: string;
      attributes?: Record<string, unknown>;
    }
  ) {
    // userId를 attributes 내에 병합
    const attributes = {
      ...(input.attributes || {}),
      userId: input.userId,
    };

    // 기존 Contact 검색 (attributes.userId 일치)
    const existing = await this.prisma.contact.findFirst({
      where: {
        environmentId,
        attributes: {
          path: ['userId'],
          equals: input.userId,
        },
      },
    });

    if (existing) {
      // 기존 Contact 업데이트
      return this.prisma.contact.update({
        where: { id: existing.id },
        data: { attributes },
      });
    }

    // 새 Contact 생성
    return this.prisma.contact.create({
      data: {
        environmentId,
        attributes,
      },
    });
  }
}
