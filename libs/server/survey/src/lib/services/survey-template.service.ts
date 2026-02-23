import { Injectable } from '@nestjs/common';
import {
  DEFAULT_TEMPLATES,
  type SurveyTemplate,
} from '../templates/default-templates.js';

/**
 * 설문 템플릿 서비스.
 * 내장된 프리셋 템플릿(NPS, CSAT, CES)을 제공한다.
 */
@Injectable()
export class SurveyTemplateService {
  /**
   * 템플릿 목록을 반환한다.
   * @param category - 카테고리 필터 (선택)
   */
  getTemplates(category?: string): SurveyTemplate[] {
    if (category) {
      return DEFAULT_TEMPLATES.filter((t) => t.category === category);
    }
    return DEFAULT_TEMPLATES;
  }

  /**
   * 단일 템플릿을 ID로 조회한다.
   * @param templateId - 템플릿 ID (nps, csat, ces)
   * @returns 템플릿 또는 undefined
   */
  getTemplateById(templateId: string): SurveyTemplate | undefined {
    return DEFAULT_TEMPLATES.find((t) => t.id === templateId);
  }
}
