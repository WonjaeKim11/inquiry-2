import { Injectable, BadRequestException } from '@nestjs/common';
import { validateSchemaShape, validateSchema } from '@coltorapps/builder';
import {
  surveyBuilder,
  validateSurveyLogic,
  detectCyclicLogic,
} from '@inquiry/survey-builder-config';
import type {
  WelcomeCard,
  HiddenFields,
  LogicItem,
} from '@inquiry/survey-builder-config';
import { HIDDEN_FIELD_FORBIDDEN_IDS } from '../constants/hidden-field-forbidden-ids.js';

/**
 * 설문 발행 전 검증 서비스.
 * Builder 스키마 구조 + 비즈니스 규칙 + 조건부 로직을 3단계로 검증한다.
 */
@Injectable()
export class SurveyValidationService {
  /**
   * 발행 전 전체 검증을 수행한다.
   * 1) builder 스키마 구조 검증 (validateSchemaShape + validateSchema)
   * 2) 비즈니스 규칙 검증 (ending, welcomeCard, PIN, hiddenField, displayOption)
   * 3) 조건부 로직 검증 (블록 로직 구조 + 순환 검출)
   *
   * @param survey - Prisma에서 조회한 설문 객체
   * @throws BadRequestException - 검증 실패 시
   */
  async validateForPublish(survey: {
    schema: unknown;
    endings: unknown;
    welcomeCard: unknown;
    pin: string | null;
    hiddenFields: unknown;
    displayOption: string;
    displayLimit: number | null;
  }): Promise<void> {
    // 1단계: Builder 스키마 구조 검증
    await this.validateBuilderSchema(survey.schema);

    // 2단계: 비즈니스 규칙 검증
    this.validateBusinessRules(survey);

    // 3단계: 조건부 로직 검증
    this.validateLogic(survey.schema, survey.hiddenFields);
  }

  /**
   * Builder 스키마 구조를 검증한다.
   * validateSchemaShape로 형태 검증 후, validateSchema로 전체 검증.
   */
  private async validateBuilderSchema(schema: unknown): Promise<void> {
    if (!schema || typeof schema !== 'object') {
      throw new BadRequestException('설문 스키마가 설정되지 않았습니다.');
    }

    try {
      // 스키마 형태 검증 (동기)
      const shapeResult = validateSchemaShape(schema, surveyBuilder);
      if (!shapeResult.success) {
        throw new BadRequestException(
          `설문 스키마 형태 오류: ${shapeResult.reason}`
        );
      }

      // 전체 스키마 검증 (비동기 — 엔티티 속성 검증 포함)
      await validateSchema(schema, surveyBuilder);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : '알 수 없는 오류';
      throw new BadRequestException(`설문 스키마 검증 실패: ${message}`);
    }
  }

  /**
   * 비즈니스 규칙을 검증한다.
   * - ending 1개 이상 필수
   * - welcomeCard 활성 시 headline 필수
   * - PIN 4자리
   * - hiddenField 금지 ID 검사
   * - displaySome이면 displayLimit 필수
   */
  private validateBusinessRules(survey: {
    endings: unknown;
    welcomeCard: unknown;
    pin: string | null;
    hiddenFields: unknown;
    displayOption: string;
    displayLimit: number | null;
  }): void {
    const errors: string[] = [];

    // ending 1개 이상 필수
    const endings = survey.endings as unknown[];
    if (!Array.isArray(endings) || endings.length === 0) {
      errors.push('최소 1개의 종료 카드(ending)가 필요합니다.');
    }

    // welcomeCard 활성 시 headline 필수
    const welcomeCard = survey.welcomeCard as WelcomeCard;
    if (welcomeCard && welcomeCard.enabled) {
      if (
        !welcomeCard.headline ||
        Object.keys(welcomeCard.headline).length === 0
      ) {
        errors.push('Welcome Card가 활성화된 경우 headline은 필수입니다.');
      }
    }

    // PIN 검증 (설정된 경우 4자리)
    if (survey.pin !== null && survey.pin !== undefined) {
      if (!/^\d{4}$/.test(survey.pin)) {
        errors.push('PIN은 4자리 숫자여야 합니다.');
      }
    }

    // hiddenField 금지 ID 검사
    const hiddenFields = survey.hiddenFields as HiddenFields;
    if (
      hiddenFields &&
      hiddenFields.enabled &&
      Array.isArray(hiddenFields.fieldIds)
    ) {
      const forbidden = hiddenFields.fieldIds.filter((id) =>
        HIDDEN_FIELD_FORBIDDEN_IDS.includes(id)
      );
      if (forbidden.length > 0) {
        errors.push(
          `다음 Hidden Field ID는 사용할 수 없습니다: ${forbidden.join(', ')}`
        );
      }
    }

    // displaySome이면 displayLimit 필수
    if (survey.displayOption === 'displaySome' && !survey.displayLimit) {
      errors.push(
        'displayOption이 "displaySome"인 경우 displayLimit는 필수입니다.'
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join(' '));
    }
  }

  /**
   * 조건부 로직을 검증한다.
   * - 각 Block의 로직 아이템 구조 검증
   * - 순환 로직 검출
   *
   * @param schema - 설문 빌더 스키마
   * @param hiddenFields - Hidden Fields 설정
   */
  private validateLogic(schema: unknown, hiddenFields: unknown): void {
    if (!schema || typeof schema !== 'object') return;

    const schemaObj = schema as Record<string, unknown>;
    const entities = schemaObj['entities'] as
      | Record<
          string,
          {
            type: string;
            attributes?: Record<string, unknown>;
            children?: string[];
          }
        >
      | undefined;
    if (!entities) return;

    // 블록/엘리먼트/변수/hiddenField ID 수집
    const blockIds: string[] = [];
    const elementIds: string[] = [];
    const blockLogicMap: Record<string, LogicItem[]> = {};
    const blockFallbackMap: Record<string, string | null | undefined> = {};

    for (const [entityId, entity] of Object.entries(entities)) {
      if (entity.type === 'block') {
        blockIds.push(entityId);
        const attrs = entity.attributes ?? {};
        const logicItems = attrs['logicItems'] as LogicItem[] | undefined;
        const logicFallback = attrs['logicFallback'] as
          | string
          | null
          | undefined;
        blockLogicMap[entityId] = logicItems ?? [];
        blockFallbackMap[entityId] = logicFallback;
      } else {
        elementIds.push(entityId);
      }
    }

    // Hidden Field ID 수집
    const hf = hiddenFields as HiddenFields | null | undefined;
    const hiddenFieldIds =
      hf && hf.enabled && Array.isArray(hf.fieldIds) ? hf.fieldIds : [];

    // Variable ID 수집 (schema에 variables가 있는 경우)
    const variables = schemaObj['variables'] as
      | Array<{ id: string }>
      | undefined;
    const variableIds = Array.isArray(variables)
      ? variables.map((v) => v.id)
      : [];

    // 로직이 하나도 없으면 검증 건너뛰기
    const hasAnyLogic = Object.values(blockLogicMap).some(
      (items) => items.length > 0
    );
    const hasAnyFallback = Object.values(blockFallbackMap).some(
      (fb) => fb != null
    );
    if (!hasAnyLogic && !hasAnyFallback) return;

    // 통합 검증 수행
    const result = validateSurveyLogic(
      blockLogicMap,
      blockFallbackMap,
      elementIds,
      blockIds,
      hiddenFieldIds,
      variableIds
    );

    const errors: string[] = [];

    // 블록 오류 수집
    for (const err of result.blockErrors) {
      const prefix = err.logicItemId
        ? `블록 "${err.blockId}" 로직 "${err.logicItemId}"`
        : `블록 "${err.blockId}"`;
      errors.push(`${prefix}: ${err.message}`);
    }

    // 순환 오류
    if (result.cycleResult.hasCycle) {
      errors.push(
        `순환 로직이 감지되었습니다: ${result.cycleResult.cyclePath.join(
          ' → '
        )}`
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join(' '));
    }
  }
}
