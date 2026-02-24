'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Button,
  Label,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@inquiry/client-ui';
import {
  addLogicItem,
  removeLogicItem,
  addCondition,
  removeCondition,
  toggleConnector,
  addAction,
  removeAction,
  createConditionGroup,
  isSingleCondition,
  MAX_LOGIC_ITEMS_PER_BLOCK,
  MAX_CONDITIONS_PER_GROUP,
  MAX_ACTIONS_PER_ITEM,
} from '@inquiry/survey-builder-config';
import type {
  LogicItem,
  ConditionGroup,
  SingleCondition,
  Action,
} from '@inquiry/survey-builder-config';
import { useBuilderStoreContext } from './BuilderStoreContext';

/**
 * ID 생성 유틸. crypto.randomUUID 사용.
 * 로직 아이템, 조건, 액션에 고유 ID를 부여할 때 사용한다.
 */
function generateId(): string {
  return crypto.randomUUID();
}

interface BlockLogicEditorProps {
  /** Block Entity ID */
  entityId: string;
  /** 현재 Block에 설정된 로직 아이템 배열 */
  logicItems: LogicItem[];
  /** 모든 로직 조건 불일치 시 이동할 기본 블록 ID (null이면 자연 순서) */
  logicFallback: string | null;
}

/**
 * Block Logic 편집기.
 *
 * ConditionGroup 기반 조건부 로직을 시각적으로 편집한다.
 * 각 LogicItem은 조건 그룹(AND/OR)과 액션 배열로 구성된다.
 * 지원하는 3가지 액션: calculate, requireAnswer, jumpToBlock.
 *
 * @param props - BlockLogicEditorProps
 */
export function BlockLogicEditor({
  entityId,
  logicItems,
  logicFallback,
}: BlockLogicEditorProps) {
  const { t } = useTranslation();
  const { builderStore, blockLabels } = useBuilderStoreContext();

  /** 각 LogicItem 펼침/접힘 상태 (item.id -> boolean) */
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {}
  );

  /**
   * LogicItem 펼침/접힘 상태를 토글한다.
   *
   * @param itemId - 토글할 LogicItem ID
   */
  const toggleItemExpanded = useCallback((itemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  /**
   * logicItems 속성을 builderStore에 업데이트한다.
   *
   * @param items - 새 LogicItem 배열
   */
  const setLogicItems = useCallback(
    (items: LogicItem[]) => {
      builderStore.setEntityAttribute(entityId, 'logicItems', items);
    },
    [builderStore, entityId]
  );

  /**
   * logicFallback 속성을 builderStore에 업데이트한다.
   *
   * @param fallback - 폴백 블록 ID (null이면 자연 순서)
   */
  const setLogicFallback = useCallback(
    (fallback: string | null) => {
      builderStore.setEntityAttribute(entityId, 'logicFallback', fallback);
    },
    [builderStore, entityId]
  );

  /**
   * 새 LogicItem을 추가한다.
   * 빈 조건 그룹과 빈 액션 배열로 초기화한다.
   */
  const handleAddItem = useCallback(() => {
    const newItem: LogicItem = {
      id: generateId(),
      conditions: createConditionGroup(generateId(), 'and'),
      actions: [],
    };
    const updated = addLogicItem(logicItems, newItem);
    setLogicItems(updated);
    // 새 아이템은 기본적으로 펼쳐진 상태로 표시
    setExpandedItems((prev) => ({ ...prev, [newItem.id]: true }));
  }, [logicItems, setLogicItems]);

  /**
   * LogicItem을 삭제한다.
   *
   * @param itemId - 삭제할 LogicItem ID
   */
  const handleRemoveItem = useCallback(
    (itemId: string) => {
      const updated = removeLogicItem(logicItems, itemId);
      setLogicItems(updated);
    },
    [logicItems, setLogicItems]
  );

  /**
   * LogicItem에 새 SingleCondition을 추가한다.
   * 기본값: leftOperand = {type: 'element', id: ''}, operator = 'equals'
   *
   * @param itemId - 대상 LogicItem ID
   */
  const handleAddCondition = useCallback(
    (itemId: string) => {
      const item = logicItems.find((i) => i.id === itemId);
      if (!item) return;

      const newCondition: SingleCondition = {
        id: generateId(),
        leftOperand: { type: 'element', id: '' },
        operator: 'equals',
      };
      const updatedConditions = addCondition(item.conditions, newCondition);
      const updatedItems = logicItems.map((i) =>
        i.id === itemId ? { ...i, conditions: updatedConditions } : i
      );
      setLogicItems(updatedItems);
    },
    [logicItems, setLogicItems]
  );

  /**
   * LogicItem에서 SingleCondition을 삭제한다.
   *
   * @param itemId - 대상 LogicItem ID
   * @param conditionId - 삭제할 조건 ID
   */
  const handleRemoveCondition = useCallback(
    (itemId: string, conditionId: string) => {
      const item = logicItems.find((i) => i.id === itemId);
      if (!item) return;

      const updatedConditions = removeCondition(item.conditions, conditionId);
      const updatedItems = logicItems.map((i) =>
        i.id === itemId ? { ...i, conditions: updatedConditions } : i
      );
      setLogicItems(updatedItems);
    },
    [logicItems, setLogicItems]
  );

  /**
   * ConditionGroup의 AND/OR connector를 토글한다.
   *
   * @param itemId - 대상 LogicItem ID
   */
  const handleToggleConnector = useCallback(
    (itemId: string) => {
      const item = logicItems.find((i) => i.id === itemId);
      if (!item) return;

      const updatedConditions = toggleConnector(item.conditions);
      const updatedItems = logicItems.map((i) =>
        i.id === itemId ? { ...i, conditions: updatedConditions } : i
      );
      setLogicItems(updatedItems);
    },
    [logicItems, setLogicItems]
  );

  /**
   * LogicItem에 새 Action을 추가한다.
   * 기본값: jumpToBlock 타입으로 초기화한다.
   *
   * @param itemId - 대상 LogicItem ID
   */
  const handleAddAction = useCallback(
    (itemId: string) => {
      const item = logicItems.find((i) => i.id === itemId);
      if (!item) return;

      const newAction: Action = {
        id: generateId(),
        objective: 'jumpToBlock',
        targetBlockId: '',
      };
      const updatedItem = addAction(item, newAction);
      const updatedItems = logicItems.map((i) =>
        i.id === itemId ? updatedItem : i
      );
      setLogicItems(updatedItems);
    },
    [logicItems, setLogicItems]
  );

  /**
   * LogicItem에서 Action을 삭제한다.
   *
   * @param itemId - 대상 LogicItem ID
   * @param actionId - 삭제할 액션 ID
   */
  const handleRemoveAction = useCallback(
    (itemId: string, actionId: string) => {
      const item = logicItems.find((i) => i.id === itemId);
      if (!item) return;

      const updatedItem = removeAction(item, actionId);
      const updatedItems = logicItems.map((i) =>
        i.id === itemId ? updatedItem : i
      );
      setLogicItems(updatedItems);
    },
    [logicItems, setLogicItems]
  );

  /**
   * Block 선택 옵션 목록.
   * blockLabels에서 Block ID -> "Block N" 라벨 매핑을 가져온다.
   */
  const blockOptions = Object.entries(blockLabels).map(([id, label]) => ({
    value: id,
    label: label,
  }));

  /**
   * 액션 objective의 사용자 표시 라벨을 반환한다.
   *
   * @param objective - 액션 유형 ('calculate' | 'requireAnswer' | 'jumpToBlock')
   * @returns i18n된 라벨 문자열
   */
  const getActionObjectiveLabel = (objective: Action['objective']): string => {
    switch (objective) {
      case 'calculate':
        return t('surveyEditor.logic.actionType.calculate', 'Calculate');
      case 'requireAnswer':
        return t(
          'surveyEditor.logic.actionType.requireAnswer',
          'Require Answer'
        );
      case 'jumpToBlock':
        return t('surveyEditor.logic.actionType.jumpToBlock', 'Jump to Block');
      default:
        return objective;
    }
  };

  /**
   * ConditionGroup 내 조건 수를 재귀적으로 계산한다 (SingleCondition만 카운트).
   *
   * @param group - 대상 조건 그룹
   * @returns SingleCondition 총 개수
   */
  const countConditions = (group: ConditionGroup): number => {
    return group.conditions.reduce((count, item) => {
      if (isSingleCondition(item)) return count + 1;
      return count + countConditions(item as ConditionGroup);
    }, 0);
  };

  return (
    <div className="space-y-4">
      {/* 헤더: 타이틀 + 규칙 추가 버튼 */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          {t('surveyEditor.logic.title', 'Logic')}
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          disabled={logicItems.length >= MAX_LOGIC_ITEMS_PER_BLOCK}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t('surveyEditor.logic.addItem', 'Add Logic Rule')}
        </Button>
      </div>

      {/* 로직 아이템이 없을 때 안내 메시지 */}
      {logicItems.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t(
            'surveyEditor.logic.emptyDescription',
            'No logic rules defined. Add a rule to create conditional branching.'
          )}
        </p>
      )}

      {/* Logic Items 목록 */}
      {logicItems.map((item, itemIdx) => {
        const isExpanded = expandedItems[item.id] ?? false;
        const conditionCount = countConditions(item.conditions);

        return (
          <div key={item.id} className="rounded-md border p-3 space-y-3">
            {/* 아이템 헤더: 규칙 번호, 조건/액션 요약, 펼침 토글, 삭제 */}
            <div className="flex items-center justify-between">
              <button
                className="flex items-center gap-2"
                onClick={() => toggleItemExpanded(item.id)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Badge variant="secondary" className="text-xs">
                  {t('surveyEditor.logic.rule', 'Rule')} {itemIdx + 1}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {t(
                    'surveyEditor.logic.itemSummary',
                    '{{conditions}} condition(s), {{actions}} action(s)',
                    {
                      conditions: conditionCount,
                      actions: item.actions.length,
                    }
                  )}
                </span>
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveItem(item.id)}
                className="h-6 w-6 p-0"
                aria-label={t(
                  'surveyEditor.logic.removeItem',
                  'Remove logic rule'
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* 펼쳐진 경우: 조건 + 액션 상세 편집 */}
            {isExpanded && (
              <>
                {/* Conditions 섹션 */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    {t('surveyEditor.logic.conditions', 'Conditions')}
                  </Label>

                  {/* AND/OR 전환 버튼 */}
                  <div className="rounded-md bg-muted/50 p-2">
                    <button
                      onClick={() => handleToggleConnector(item.id)}
                      className="mb-1 rounded bg-muted px-2 py-0.5 text-xs font-medium hover:bg-muted/80 transition-colors"
                      aria-label={t(
                        'surveyEditor.logic.toggleConnector',
                        'Toggle condition connector between AND and OR'
                      )}
                    >
                      {item.conditions.connector.toUpperCase()}
                    </button>

                    {/* 조건 목록 (최상위 그룹의 직계 조건만 표시) */}
                    {item.conditions.conditions.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {item.conditions.conditions.map((condition) => (
                          <div
                            key={condition.id}
                            className="flex items-center gap-2 rounded bg-background px-2 py-1"
                          >
                            {isSingleCondition(condition) ? (
                              <>
                                <span className="text-xs text-muted-foreground">
                                  {condition.leftOperand.type}:
                                  {condition.leftOperand.id || '?'}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {condition.operator}
                                </Badge>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {t(
                                  'surveyEditor.logic.nestedGroup',
                                  'Group ({{connector}})',
                                  {
                                    connector: (
                                      condition as ConditionGroup
                                    ).connector.toUpperCase(),
                                  }
                                )}
                                {' - '}
                                {t(
                                  'surveyEditor.logic.conditionCount',
                                  '{{count}} condition(s)',
                                  {
                                    count: countConditions(
                                      condition as ConditionGroup
                                    ),
                                  }
                                )}
                              </span>
                            )}
                            <div className="flex-1" />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveCondition(item.id, condition.id)
                              }
                              className="h-5 w-5 p-0"
                              aria-label={t(
                                'surveyEditor.logic.removeCondition',
                                'Remove condition'
                              )}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t(
                          'surveyEditor.logic.noConditions',
                          'No conditions. This rule will always match.'
                        )}
                      </p>
                    )}
                  </div>

                  {/* 조건 추가 버튼 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddCondition(item.id)}
                    disabled={conditionCount >= MAX_CONDITIONS_PER_GROUP}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {t('surveyEditor.logic.addCondition', 'Add Condition')}
                  </Button>
                </div>

                {/* Actions 섹션 */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    {t('surveyEditor.logic.actions', 'Actions')}
                  </Label>

                  {/* 액션 목록 */}
                  {item.actions.length > 0 ? (
                    item.actions.map((action: Action) => (
                      <div
                        key={action.id}
                        className="flex items-center gap-2 rounded-md bg-muted/50 p-2"
                      >
                        <Badge variant="outline" className="text-xs">
                          {getActionObjectiveLabel(action.objective)}
                        </Badge>
                        {/* 액션 타입별 요약 정보 표시 */}
                        {action.objective === 'jumpToBlock' && (
                          <span className="text-xs text-muted-foreground">
                            {blockLabels[action.targetBlockId] ??
                              t(
                                'surveyEditor.logic.notSelected',
                                'Not selected'
                              )}
                          </span>
                        )}
                        {action.objective === 'requireAnswer' && (
                          <span className="text-xs text-muted-foreground">
                            {action.targetElementId ||
                              t(
                                'surveyEditor.logic.notSelected',
                                'Not selected'
                              )}
                          </span>
                        )}
                        {action.objective === 'calculate' && (
                          <span className="text-xs text-muted-foreground">
                            {action.target.type}:{action.target.id || '?'}{' '}
                            {action.operator}
                          </span>
                        )}
                        <div className="flex-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAction(item.id, action.id)}
                          className="h-6 w-6 p-0"
                          aria-label={t(
                            'surveyEditor.logic.removeAction',
                            'Remove action'
                          )}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t('surveyEditor.logic.noActions', 'No actions defined.')}
                    </p>
                  )}

                  {/* 액션 추가 버튼 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddAction(item.id)}
                    disabled={item.actions.length >= MAX_ACTIONS_PER_ITEM}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {t('surveyEditor.logic.addAction', 'Add Action')}
                  </Button>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Fallback Block 설정 */}
      <div>
        <Label className="mb-1.5 block text-sm">
          {t('surveyEditor.logic.fallback', 'Fallback Block')}
        </Label>
        <p className="mb-2 text-xs text-muted-foreground">
          {t(
            'surveyEditor.logic.fallbackDescription',
            'The block to navigate to when no logic rules match.'
          )}
        </p>
        <Select
          value={logicFallback ?? '__none__'}
          onValueChange={(v) => setLogicFallback(v === '__none__' ? null : v)}
        >
          <SelectTrigger className="h-8">
            <SelectValue
              placeholder={t(
                'surveyEditor.logic.selectFallback',
                'Select fallback block...'
              )}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              {t('surveyEditor.logic.noFallback', 'None (natural order)')}
            </SelectItem>
            {blockOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
