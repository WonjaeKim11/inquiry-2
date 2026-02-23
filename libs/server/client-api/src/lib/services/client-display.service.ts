import { Injectable } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';

/**
 * Client API Display 서비스.
 * 설문 노출 이벤트를 기록한다.
 */
@Injectable()
export class ClientDisplayService {
  constructor(private readonly prisma: ServerPrismaService) {}

  /**
   * Display 이벤트 생성.
   * 특정 설문이 사용자에게 노출되었을 때 호출된다.
   * @param input - surveyId, environmentId를 포함한 Display 생성 데이터
   */
  async createDisplay(input: { surveyId: string; environmentId: string }) {
    return this.prisma.display.create({
      data: {
        surveyId: input.surveyId,
        environmentId: input.environmentId,
      },
    });
  }
}
