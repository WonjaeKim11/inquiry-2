import { z } from 'zod';

/**
 * Recall 참조 정보.
 * 텍스트 내 #recall:id/fallback:value# 패턴에서 파싱된 정보.
 */
export interface RecallInfo {
  /** 참조 대상 ID (변수, 질문, 히든 필드 등) */
  id: string;
  /** 값이 없을 때 표시할 대체 텍스트 */
  fallback: string;
}

/**
 * Recall 치환 컨텍스트.
 * resolveRecalls()에 전달하여 실제 값으로 치환할 때 사용.
 */
export interface RecallContext {
  /** 변수 목록 (id, name, type, value) */
  variables: Array<{
    id: string;
    name: string;
    type: string;
    value: string | number;
  }>;
  /** 응답 데이터 (element ID -> 응답 값) */
  responseData: Record<string, unknown>;
  /** 히든 필드 값 (field ID -> 값) */
  hiddenFieldValues: Record<string, string>;
}

/**
 * Recall 아이템 (에디터 UI에서 사용).
 * recall 태그를 에디터 표시용 라벨로 변환할 때 참조.
 */
export interface RecallItem {
  /** 대상 ID */
  id: string;
  /** 에디터에 표시할 라벨 */
  label: string;
  /** 참조 유형 */
  type: 'variable' | 'element' | 'hiddenField';
}

/** RecallInfo Zod 스키마 */
export const recallInfoSchema = z.object({
  id: z.string().min(1),
  fallback: z.string(),
});

/** RecallContext Zod 스키마 */
export const recallContextSchema = z.object({
  variables: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      value: z.union([z.string(), z.number()]),
    })
  ),
  responseData: z.record(z.string(), z.unknown()),
  hiddenFieldValues: z.record(z.string(), z.string()),
});

/** RecallItem Zod 스키마 */
export const recallItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['variable', 'element', 'hiddenField']),
});
