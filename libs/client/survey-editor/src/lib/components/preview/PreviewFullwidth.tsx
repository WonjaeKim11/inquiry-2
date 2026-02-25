'use client';

import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { WelcomeCard, SurveyEnding } from '@inquiry/survey-builder-config';

/** schema 데이터 내 개별 Entity 타입 */
interface SchemaEntity {
  type: string;
  attributes: Record<string, unknown>;
  children?: string[];
  parentId?: string;
}

interface PreviewFullwidthProps {
  /** Builder Store의 schema (root, entities) */
  schema:
    | {
        root?: readonly string[];
        entities?: Record<string, SchemaEntity>;
      }
    | undefined;
  /** 웰컴 카드 설정 */
  welcomeCard: WelcomeCard;
  /** 종료 카드 목록 */
  endings: SurveyEnding[];
  /** 현재 활성 Element ID */
  activeElementId: string | null;
}

/**
 * Link 모드 프리뷰.
 * max-w-2xl 중앙 정렬로 설문을 읽기 전용으로 표시한다.
 * WelcomeCard → Block별 Elements → EndingCard 순서로 렌더링하고,
 * 활성 Element에 ring-2 하이라이트 + 자동 스크롤을 적용한다.
 */
export function PreviewFullwidth({
  schema,
  welcomeCard,
  endings,
  activeElementId,
}: PreviewFullwidthProps) {
  const { t } = useTranslation();
  const activeRef = useRef<HTMLDivElement>(null);

  // 활성 Element 변경 시 자동 스크롤
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeElementId]);

  const rootIds = (schema?.root ?? []) as string[];
  const entities = (schema?.entities ?? {}) as Record<string, SchemaEntity>;

  /**
   * I18nString에서 표시할 텍스트를 추출한다.
   * 'default' 키를 우선 사용하고, 없으면 첫 번째 값을 반환한다.
   */
  const getI18nText = (
    value: Record<string, string> | undefined
  ): string | undefined => {
    if (!value) return undefined;
    return value['default'] ?? Object.values(value)[0];
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-4">
      <div className="space-y-2">
        {/* Welcome Card */}
        {welcomeCard.enabled && (
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t('surveyEditor.preview.welcomeCard', 'Welcome Card')}
            </p>
            {welcomeCard.headline && (
              <p className="mt-1 text-sm font-medium">
                {getI18nText(welcomeCard.headline)}
              </p>
            )}
          </div>
        )}

        {/* Blocks + Elements */}
        {rootIds.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('surveyEditor.preview.noElements', 'No elements yet')}
          </p>
        )}
        {rootIds.map((blockId) => {
          const block = entities[blockId];
          if (!block) return null;
          const children = (block.children ?? []) as string[];
          return (
            <div key={blockId} className="space-y-1.5">
              {children.map((elementId) => {
                const element = entities[elementId];
                if (!element) return null;
                const isActive = elementId === activeElementId;
                const headline = getI18nText(
                  element.attributes?.headline as
                    | Record<string, string>
                    | undefined
                );
                return (
                  <div
                    key={elementId}
                    ref={isActive ? activeRef : undefined}
                    className={`rounded-lg border p-3 transition-all ${
                      isActive ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t(
                        `surveyEditor.element.types.${element.type}`,
                        element.type
                      )}
                    </p>
                    {headline && <p className="mt-1 text-sm">{headline}</p>}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Ending Cards */}
        {endings.map((ending, idx) => (
          <div
            key={ending.id ?? idx}
            className="rounded-lg border bg-muted/50 p-3"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {t('surveyEditor.preview.endingCard', 'Ending Card')}
            </p>
            {ending.headline && (
              <p className="mt-1 text-sm font-medium">
                {getI18nText(ending.headline)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
