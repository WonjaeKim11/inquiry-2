import { Injectable, Logger } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import {
  evaluateConditionGroup,
  DEFAULT_EVALUATION_RESULT,
} from '@inquiry/survey-builder-config';
import type {
  QuotaEvaluationInput,
  QuotaEvaluationResult,
  ConditionGroup,
  LogicEvaluationContext,
} from '@inquiry/survey-builder-config';

/** Prisma Quota 레코드 타입 */
interface QuotaRecord {
  id: string;
  name: string;
  limit: number;
  logic: unknown;
  action: 'endSurvey' | 'continueSurvey';
  endingCardId: string | null;
  countPartialSubmissions: boolean;
}

/**
 * 쿼터 평가 서비스.
 * 응답 데이터를 기반으로 쿼터 조건을 평가하고,
 * DB 트랜잭션 내에서 카운트를 확인하여 결과를 반환한다.
 *
 * NFR-014-01: DB 트랜잭션 내 쿼터 평가
 * NFR-014-03: 에러 시 설문 진행 차단 금지
 * NFR-014-06: skipDuplicates로 동시성 처리
 */
@Injectable()
export class QuotaEvaluationService {
  private readonly logger = new Logger(QuotaEvaluationService.name);

  constructor(private readonly prisma: ServerPrismaService) {}

  /**
   * 설문 응답에 대해 쿼터를 평가한다.
   *
   * 1. 해당 설문의 모든 쿼터 조회
   * 2. 부분 제출 필터링 (isFinished 기반)
   * 3. evaluateConditionGroup()으로 각 쿼터 조건 평가
   * 4. DB 트랜잭션 내에서:
   *    a. failed 쿼터: 기존 ResponseQuota 삭제
   *    b. passed 쿼터: screenedIn 카운트 조회 (현재 응답 제외)
   *    c. 한도 미초과: ResponseQuota screenedIn 생성 (skipDuplicates)
   *    d. 한도 초과: ResponseQuota screenedOut upsert
   *    e. 첫 번째 초과 쿼터 액션 적용
   * 5. QuotaEvaluationResult 반환
   *
   * @param input - 평가 입력 데이터
   * @returns 평가 결과
   */
  async evaluate(input: QuotaEvaluationInput): Promise<QuotaEvaluationResult> {
    try {
      // 1. 해당 설문의 모든 쿼터 조회
      const quotas = await this.prisma.quota.findMany({
        where: { surveyId: input.surveyId },
      });

      if (quotas.length === 0) {
        return { ...DEFAULT_EVALUATION_RESULT };
      }

      // 2. 부분 제출 필터링
      const evaluableQuotas = this.filterEvaluableQuotas(
        quotas as QuotaRecord[],
        input.isFinished
      );

      if (evaluableQuotas.length === 0) {
        return { ...DEFAULT_EVALUATION_RESULT };
      }

      // 3. 조건 평가
      const context: LogicEvaluationContext = {
        responses: input.responseData,
        variables: input.variableData ?? {},
        hiddenFields: input.hiddenFieldData ?? {},
        elementStatuses: {},
      };

      const passed: QuotaRecord[] = [];
      const failed: QuotaRecord[] = [];

      for (const quota of evaluableQuotas) {
        const conditionPassed = this.evaluateQuotaCondition(
          quota.logic,
          context
        );
        if (conditionPassed) {
          passed.push(quota);
        } else {
          failed.push(quota);
        }
      }

      // 4. DB 트랜잭션 내에서 카운트 확인 및 ResponseQuota 관리
      const result = await this.prisma.$transaction(async (tx) => {
        // 4a. failed 쿼터: 기존 ResponseQuota 삭제
        if (failed.length > 0) {
          await tx.responseQuota.deleteMany({
            where: {
              responseId: input.responseId,
              quotaId: { in: failed.map((q) => q.id) },
            },
          });
        }

        // 4b~e. passed 쿼터 처리
        let firstFullQuota: QuotaRecord | null = null;

        for (const quota of passed) {
          // 4b. screenedIn 카운트 조회 (현재 응답 제외)
          const screenedInCount = await tx.responseQuota.count({
            where: {
              quotaId: quota.id,
              status: 'screenedIn',
              responseId: { not: input.responseId },
            },
          });

          if (screenedInCount >= quota.limit) {
            // 4d. 한도 초과: screenedOut upsert
            await tx.responseQuota.upsert({
              where: {
                responseId_quotaId: {
                  responseId: input.responseId,
                  quotaId: quota.id,
                },
              },
              create: {
                responseId: input.responseId,
                quotaId: quota.id,
                status: 'screenedOut',
              },
              update: {
                status: 'screenedOut',
              },
            });

            if (!firstFullQuota) {
              firstFullQuota = quota;
            }
          } else {
            // 4c. 한도 미초과: screenedIn (skipDuplicates -- NFR-014-06)
            await tx.responseQuota.upsert({
              where: {
                responseId_quotaId: {
                  responseId: input.responseId,
                  quotaId: quota.id,
                },
              },
              create: {
                responseId: input.responseId,
                quotaId: quota.id,
                status: 'screenedIn',
              },
              update: {
                status: 'screenedIn',
              },
            });
          }
        }

        // 4e. 첫 번째 초과 쿼터 액션 적용
        if (firstFullQuota) {
          return {
            shouldEndSurvey: firstFullQuota.action === 'endSurvey',
            quotaFull: true,
            quotaId: firstFullQuota.id,
            action: firstFullQuota.action as 'endSurvey' | 'continueSurvey',
            endingCardId: firstFullQuota.endingCardId,
          } satisfies QuotaEvaluationResult;
        }

        return { ...DEFAULT_EVALUATION_RESULT };
      });

      return result;
    } catch (error) {
      // NFR-014-03: 에러 시 설문 진행 차단 금지
      this.logger.error(
        `Quota evaluation failed for survey ${input.surveyId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      return { ...DEFAULT_EVALUATION_RESULT };
    }
  }

  /**
   * 부분 제출 기반으로 평가 대상 쿼터를 필터링한다.
   * - endSurvey 쿼터: 항상 평가
   * - continueSurvey 쿼터: countPartialSubmissions=true일 때만 미완료 응답 평가
   */
  private filterEvaluableQuotas(
    quotas: QuotaRecord[],
    isFinished: boolean
  ): QuotaRecord[] {
    if (isFinished) {
      return quotas; // 완료된 응답은 모든 쿼터에 평가
    }

    // 미완료 응답: endSurvey 쿼터 또는 countPartialSubmissions=true인 쿼터만 평가
    return quotas.filter(
      (q) => q.action === 'endSurvey' || q.countPartialSubmissions
    );
  }

  /**
   * 쿼터 조건을 평가한다.
   * 빈 객체(조건 없음)이면 모든 응답이 해당 (true).
   * ConditionGroup이면 evaluateConditionGroup으로 평가.
   */
  private evaluateQuotaCondition(
    logic: unknown,
    context: LogicEvaluationContext
  ): boolean {
    // 빈 객체 또는 null이면 조건 없음 -- 모든 응답 해당
    if (!logic || typeof logic !== 'object') return true;

    const logicObj = logic as Record<string, unknown>;
    if (!('connector' in logicObj)) return true;

    try {
      return evaluateConditionGroup(
        logicObj as unknown as ConditionGroup,
        context
      );
    } catch {
      // 조건 평가 실패 시 해당 응답 포함 (안전한 방향)
      return true;
    }
  }
}
