import { Injectable, BadRequestException } from '@nestjs/common';
import { validateSchemaShape, validateSchema } from '@coltorapps/builder';
import { surveyBuilder } from '@inquiry/survey-builder-config';
import type { WelcomeCard, HiddenFields } from '@inquiry/survey-builder-config';
import { HIDDEN_FIELD_FORBIDDEN_IDS } from '../constants/hidden-field-forbidden-ids.js';

/**
 * 설문 발행 전 검증 서비스.
 * Builder 스키마 구조 + 비즈니스 규칙을 2단계로 검증한다.
 */
@Injectable()
export class SurveyValidationService {
  /**
   * 발행 전 전체 검증을 수행한다.
   * 1) builder 스키마 구조 검증 (validateSchemaShape + validateSchema)
   * 2) 비즈니스 규칙 검증 (ending, welcomeCard, PIN, hiddenField, displayOption)
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
}
