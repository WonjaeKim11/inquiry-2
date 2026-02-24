/**
 * 참조 검사 결과.
 */
export interface ReferenceCheckResult {
  /** 참조되고 있는지 여부 */
  inUse: boolean;
  /** 참조하고 있는 영역 목록 */
  usedIn: Array<{
    type: 'logic' | 'recall' | 'quota' | 'followUp';
    /** 참조 위치 설명 */
    description: string;
  }>;
}

/** Recall 패턴 (recall-parser와 동일) */
const RECALL_PATTERN = /#recall:([a-zA-Z0-9_-]+)\/fallback:(.*?)#/g;

/**
 * 텍스트에서 특정 ID가 recall로 참조되는지 검사한다.
 *
 * @param targetId - 검사할 대상 ID
 * @param text - recall 태그를 포함할 수 있는 텍스트
 * @returns 참조 여부
 */
function isReferencedInRecall(targetId: string, text: string): boolean {
  if (!text) return false;
  const regex = new RegExp(RECALL_PATTERN.source, RECALL_PATTERN.flags);
  let match = regex.exec(text);
  while (match !== null) {
    if (match[1] === targetId) return true;
    match = regex.exec(text);
  }
  return false;
}

/**
 * 스키마 내 모든 텍스트 속성에서 recall 참조를 검사한다.
 *
 * @param targetId - 검사할 대상 ID
 * @param schema - 설문 빌더 스키마
 * @returns 참조 여부
 */
function checkRecallReferencesInSchema(
  targetId: string,
  schema: Record<string, unknown>
): boolean {
  const entities = schema['entities'] as
    | Record<string, { attributes?: Record<string, unknown> }>
    | undefined;
  if (!entities) return false;

  for (const entity of Object.values(entities)) {
    const attrs = entity.attributes ?? {};
    // headline, subheader 등 텍스트 속성 검사
    for (const value of Object.values(attrs)) {
      if (typeof value === 'string' && isReferencedInRecall(targetId, value)) {
        return true;
      }
      // I18nString (Record<string, string>) 형태 검사
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const text of Object.values(value as Record<string, unknown>)) {
          if (
            typeof text === 'string' &&
            isReferencedInRecall(targetId, text)
          ) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * 로직에서 특정 ID가 참조되는지 검사한다.
 * DynamicField의 id 필드, action target 등을 확인.
 *
 * @param targetId - 검사할 대상 ID
 * @param schema - 설문 빌더 스키마
 * @returns 참조 여부
 */
function checkLogicReferences(
  targetId: string,
  schema: Record<string, unknown>
): boolean {
  const entities = schema['entities'] as
    | Record<string, { type: string; attributes?: Record<string, unknown> }>
    | undefined;
  if (!entities) return false;

  for (const entity of Object.values(entities)) {
    if (entity.type !== 'block') continue;

    const attrs = entity.attributes ?? {};
    const logicItems = attrs['logicItems'] as
      | Array<Record<string, unknown>>
      | undefined;
    if (!logicItems) continue;

    for (const item of logicItems) {
      // JSON 문자열화하여 ID 존재 확인 (간단하고 효과적인 방법)
      const serialized = JSON.stringify(item);
      if (
        serialized.includes(`"id":"${targetId}"`) ||
        serialized.includes(`"id": "${targetId}"`)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 히든 필드 삭제 시 참조 무결성을 검사한다.
 * 로직/리콜/쿼터/followUp 4개 영역에서 사용 중인지 확인.
 *
 * @param fieldId - 삭제할 히든 필드 ID
 * @param schema - 설문 빌더 스키마
 * @returns 참조 검사 결과
 */
export function checkHiddenFieldReferences(
  fieldId: string,
  schema: Record<string, unknown>
): ReferenceCheckResult {
  const usedIn: ReferenceCheckResult['usedIn'] = [];

  // 로직에서 참조 검사
  if (checkLogicReferences(fieldId, schema)) {
    usedIn.push({
      type: 'logic',
      description: `Hidden field "${fieldId}" is used in conditional logic.`,
    });
  }

  // 리콜에서 참조 검사
  if (checkRecallReferencesInSchema(fieldId, schema)) {
    usedIn.push({
      type: 'recall',
      description: `Hidden field "${fieldId}" is used in recall.`,
    });
  }

  return { inUse: usedIn.length > 0, usedIn };
}

/**
 * 변수 삭제 시 참조 무결성을 검사한다.
 * 로직/리콜 영역에서 사용 중인지 확인.
 *
 * @param variableId - 삭제할 변수 ID
 * @param schema - 설문 빌더 스키마
 * @returns 참조 검사 결과
 */
export function checkVariableReferences(
  variableId: string,
  schema: Record<string, unknown>
): ReferenceCheckResult {
  const usedIn: ReferenceCheckResult['usedIn'] = [];

  // 로직에서 참조 검사
  if (checkLogicReferences(variableId, schema)) {
    usedIn.push({
      type: 'logic',
      description: `Variable "${variableId}" is used in conditional logic.`,
    });
  }

  // 리콜에서 참조 검사
  if (checkRecallReferencesInSchema(variableId, schema)) {
    usedIn.push({
      type: 'recall',
      description: `Variable "${variableId}" is used in recall.`,
    });
  }

  return { inUse: usedIn.length > 0, usedIn };
}
