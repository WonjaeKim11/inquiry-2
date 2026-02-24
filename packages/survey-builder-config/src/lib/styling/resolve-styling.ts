import type { BaseStyling, ProjectStyling, SurveyStyling } from './types';
import { STYLING_DEFAULTS } from './constants';
import { migrateLegacyStyling } from './legacy-migration';

/** resolveStyling 파라미터 */
export interface ResolveStylingParams {
  /** 프로젝트 스타일링 설정 */
  projectStyling?: ProjectStyling;
  /** 설문 스타일링 설정 */
  surveyStyling?: SurveyStyling;
}

/**
 * null/undefined가 아닌 값만 병합하는 깊은 병합 유틸리티.
 * StylingColor 같은 중첩 객체도 처리한다.
 */
export function deepMergeNonNull<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>
): T {
  const result = { ...base };

  for (const key of Object.keys(override) as Array<keyof T>) {
    const value = override[key];

    // null이나 undefined는 건너뛴다
    if (value === null || value === undefined) continue;

    // 중첩 객체인 경우 재귀적으로 병합한다
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMergeNonNull(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = value as T[keyof T];
    }
  }

  return result;
}

/**
 * 5단계 우선순위 해석을 통해 최종 스타일 객체를 생성한다.
 * 순수 함수 -- 서버/클라이언트 양쪽에서 사용 가능.
 *
 * 해석 순서:
 * 1. 시스템 기본값
 * 2. 프로젝트 레거시 마이그레이션
 * 3. 프로젝트 스타일링
 * 4. 설문 레거시 마이그레이션 (overrideTheme=true 시)
 * 5. 설문 스타일링 (overrideTheme=true 시)
 */
export function resolveStyling(params: ResolveStylingParams): BaseStyling {
  // 1. 시스템 기본값으로 시작
  let result: BaseStyling = { ...STYLING_DEFAULTS };

  // 2. 프로젝트 레거시 마이그레이션
  if (params.projectStyling) {
    const migrated = migrateLegacyStyling(params.projectStyling);
    result = deepMergeNonNull(result, migrated);
  }

  // 3. 프로젝트 스타일링 적용
  if (params.projectStyling) {
    result = deepMergeNonNull(
      result,
      params.projectStyling as Partial<BaseStyling>
    );
  }

  // 설문 오버라이드 확인
  const overrideTheme = params.surveyStyling?.overrideTheme ?? false;

  if (overrideTheme && params.surveyStyling) {
    // 4. 설문 레거시 마이그레이션
    const migrated = migrateLegacyStyling(params.surveyStyling);
    result = deepMergeNonNull(result, migrated);

    // 5. 설문 스타일링 적용
    result = deepMergeNonNull(
      result,
      params.surveyStyling as Partial<BaseStyling>
    );
  }

  return result;
}
