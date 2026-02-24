'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import {
  Button,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
} from '@inquiry/client-ui';
import { getApplicableRules } from '@inquiry/survey-builder-config';
import type {
  ValidationRule,
  ValidationConfig,
  ValidationRuleType,
} from '@inquiry/survey-builder-config';

/**
 * ID 생성 유틸. crypto.randomUUID 사용.
 * 검증 규칙에 고유 ID를 부여할 때 사용한다.
 */
function generateId(): string {
  return crypto.randomUUID();
}

interface ValidationRulesEditorProps {
  /** Element Entity ID */
  entityId: string;
  /** Element 유형 (openText, matrix 등). 적용 가능 규칙 필터링에 사용 */
  entityType: string;
  /** 현재 검증 설정 (undefined이면 규칙 없음) */
  validationConfig: ValidationConfig | undefined;
  /** 검증 설정 변경 콜백 */
  onChange: (config: ValidationConfig) => void;
}

/**
 * Validation Rules 편집기.
 *
 * Element 유형별로 적용 가능한 규칙을 getApplicableRules로 필터링하고,
 * 규칙 추가/삭제 및 AND/OR 논리 전환을 지원한다.
 * ValidationConfig의 logic(and/or)과 rules[] 배열을 편집한다.
 *
 * @param props - ValidationRulesEditorProps
 */
export function ValidationRulesEditor({
  entityId,
  entityType,
  validationConfig,
  onChange,
}: ValidationRulesEditorProps) {
  const { t } = useTranslation();

  /** 현재 엔티티 타입에 적용 가능한 모든 규칙 목록 */
  const applicableRules = getApplicableRules(entityType);

  /** 현재 설정된 규칙 배열 (없으면 빈 배열) */
  const rules = validationConfig?.rules ?? [];

  /** 현재 논리 결합 방식 (기본값 'and') */
  const logic = validationConfig?.logic ?? 'and';

  /**
   * 새 검증 규칙을 추가한다.
   * 기본 params는 빈 객체로 초기화하며, id는 자동 생성한다.
   *
   * @param ruleType - 추가할 규칙 유형 문자열
   */
  const handleAddRule = useCallback(
    (ruleType: string) => {
      const newRule: ValidationRule = {
        id: generateId(),
        type: ruleType as ValidationRuleType,
        params: {},
      };
      onChange({
        logic,
        ...validationConfig,
        rules: [...rules, newRule],
      });
    },
    [rules, validationConfig, onChange, logic]
  );

  /**
   * 검증 규칙을 삭제한다.
   *
   * @param ruleId - 삭제할 규칙 ID
   */
  const handleRemoveRule = useCallback(
    (ruleId: string) => {
      const updated = rules.filter((r) => r.id !== ruleId);
      onChange({
        logic,
        ...validationConfig,
        rules: updated,
      });
    },
    [rules, validationConfig, onChange, logic]
  );

  /**
   * AND/OR 논리 결합 방식을 토글한다.
   */
  const handleToggleLogic = useCallback(() => {
    const newLogic = logic === 'and' ? 'or' : 'and';
    onChange({
      ...validationConfig,
      logic: newLogic,
      rules,
    });
  }, [logic, rules, validationConfig, onChange]);

  /**
   * 아직 추가되지 않은 적용 가능 규칙 목록.
   * 이미 rules에 같은 type이 있는 규칙은 제외한다.
   */
  const availableRules = applicableRules.filter(
    (ruleType) => !rules.some((r) => r.type === ruleType)
  );

  /**
   * 규칙 유형의 사용자 표시 라벨을 반환한다.
   *
   * @param ruleType - 규칙 유형 문자열
   * @returns i18n된 라벨 문자열
   */
  const getRuleTypeLabel = (ruleType: string): string => {
    return t(`surveyEditor.element.validation.rules.${ruleType}`, ruleType);
  };

  // 이 엔티티 타입에 적용 가능한 규칙이 없으면 렌더링하지 않음
  if (applicableRules.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {t('surveyEditor.element.validation.title', 'Validation Rules')}
        </Label>

        {/* AND/OR 토글 (규칙이 2개 이상일 때만 표시) */}
        {rules.length >= 2 && (
          <button
            onClick={handleToggleLogic}
            className="rounded bg-muted px-2 py-0.5 text-xs font-medium hover:bg-muted/80 transition-colors"
            aria-label={t(
              'surveyEditor.element.validation.toggleLogic',
              'Toggle validation logic between AND and OR'
            )}
          >
            {logic.toUpperCase()}
          </button>
        )}
      </div>

      {/* 현재 규칙 목록 */}
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="flex items-center gap-2 rounded-md border p-2"
        >
          <Badge variant="secondary" className="text-xs">
            {getRuleTypeLabel(rule.type)}
          </Badge>

          {/* 서브 필드 지정이 있는 경우 표시 (address, contactInfo 등) */}
          {rule.field && (
            <span className="text-xs text-muted-foreground">
              ({rule.field})
            </span>
          )}

          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveRule(rule.id)}
            className="h-6 w-6 p-0"
            aria-label={t(
              'surveyEditor.element.validation.removeRule',
              'Remove validation rule'
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {/* 규칙이 없을 때 안내 메시지 */}
      {rules.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t(
            'surveyEditor.element.validation.emptyDescription',
            'No validation rules. Add a rule to enforce answer constraints.'
          )}
        </p>
      )}

      {/* 규칙 추가 드롭다운 */}
      {availableRules.length > 0 && (
        <Select onValueChange={handleAddRule}>
          <SelectTrigger className="h-8">
            <SelectValue
              placeholder={t(
                'surveyEditor.element.validation.addRule',
                'Add validation rule...'
              )}
            />
          </SelectTrigger>
          <SelectContent>
            {availableRules.map((ruleType) => (
              <SelectItem key={ruleType} value={ruleType}>
                {getRuleTypeLabel(ruleType)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
