'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { createId } from '@paralleldrive/cuid2';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@inquiry/client-ui';
import type { SurveyVariable } from '@inquiry/survey-builder-config';
import { useSurveyMeta } from '../../hooks/use-survey-meta';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';

/**
 * Survey Variables 편집기 카드.
 * 설문 내부에서 사용되는 변수(number/text)를 추가/편집/삭제한다.
 *
 * 각 변수는 다음 속성을 가진다:
 * - name: 변수 이름 (참조 식별자)
 * - type: 'number' | 'text' (타입 변경 시 value가 초기값으로 리셋됨)
 * - value: 현재 값 (number이면 0, text이면 빈 문자열이 기본값)
 */
export function SurveyVariablesCard() {
  const { t } = useTranslation();
  const { variables, addVariable, updateVariable, deleteVariable } =
    useSurveyMeta();

  /** 삭제 확인 대상 변수 ID. null이면 다이얼로그 숨김 */
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  /** 새 변수 추가. 기본값으로 number 타입, value 0을 생성한다 */
  const handleAdd = useCallback(() => {
    addVariable({
      id: createId(),
      name: '',
      type: 'number',
      value: 0,
    });
  }, [addVariable]);

  /**
   * 변수 부분 업데이트 헬퍼.
   * ID로 기존 변수를 찾아 변경할 필드만 병합한다.
   */
  const handleUpdate = useCallback(
    (id: string, field: Partial<SurveyVariable>) => {
      const current = variables.find((v) => v.id === id);
      if (current) {
        updateVariable({ ...current, ...field });
      }
    },
    [variables, updateVariable]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">
          {t('surveyEditor.variables.title', 'Variables')}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-1 h-4 w-4" />
          {t('surveyEditor.variables.addVariable', 'Add Variable')}
        </Button>
      </CardHeader>

      {variables.length > 0 && (
        <CardContent className="space-y-3 pt-0">
          {variables.map((variable) => (
            <div
              key={variable.id}
              className="flex items-center gap-2 rounded-md border p-2"
            >
              {/* 변수 이름 입력 */}
              <Input
                value={variable.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleUpdate(variable.id, { name: e.target.value })
                }
                placeholder={t(
                  'surveyEditor.variables.namePlaceholder',
                  'Variable name'
                )}
                className="h-8 flex-1 text-sm"
              />

              {/* 변수 타입 선택 (number/text). 타입 변경 시 value 초기화 */}
              <Select
                value={variable.type}
                onValueChange={(v) =>
                  handleUpdate(variable.id, {
                    type: v as 'number' | 'text',
                    value: v === 'number' ? 0 : '',
                  })
                }
              >
                <SelectTrigger className="h-8 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">
                    {t('surveyEditor.variables.typeNumber', 'Number')}
                  </SelectItem>
                  <SelectItem value="text">
                    {t('surveyEditor.variables.typeText', 'Text')}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* 변수 값 입력 (타입에 따라 input type 변경) */}
              <Input
                type={variable.type === 'number' ? 'number' : 'text'}
                value={variable.value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleUpdate(variable.id, {
                    value:
                      variable.type === 'number'
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
                className="h-8 w-24 text-sm"
              />

              {/* 삭제 버튼 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(variable.id)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('surveyEditor.variables.deleteTitle', 'Delete Variable')}
        description={t(
          'surveyEditor.variables.deleteDesc',
          'This variable will be permanently deleted. Logic rules referencing it may break.'
        )}
        onConfirm={() => {
          if (deleteTarget) {
            deleteVariable(deleteTarget);
            setDeleteTarget(null);
          }
        }}
      />
    </Card>
  );
}
