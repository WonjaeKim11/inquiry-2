'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createEntityComponent } from '@coltorapps/builder-react';
import { matrixEntity } from '@inquiry/survey-builder-config';
import type { I18nString, MatrixChoice } from '@inquiry/survey-builder-config';
import {
  Button,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@inquiry/client-ui';
import { createId } from '@paralleldrive/cuid2';
import { Plus, Trash2 } from 'lucide-react';
import { ElementComponent } from '../ElementComponent';
import { LocalizedInput } from '../../shared/LocalizedInput';
import { useBuilderStoreContext } from '../BuilderStoreContext';

/**
 * Matrix Entity 컴포넌트.
 * 행렬(그리드) 형태의 질문을 편집한다.
 *
 * - headline: 다국어 질문 텍스트 (LocalizedInput)
 * - rows: 행(질문 항목) CRUD 리스트
 * - columns: 열(선택지) CRUD 리스트
 * - 고급 설정: shuffleOption 토글
 */
export const MatrixComponent = createEntityComponent(matrixEntity, (props) => {
  const { entity } = props;
  const { t } = useTranslation();
  const entityId = entity.id;
  const attrs = entity.attributes;
  const { builderStore } = useBuilderStoreContext();

  const rows = (attrs.rows ?? []) as MatrixChoice[];
  const columns = (attrs.columns ?? []) as MatrixChoice[];

  /**
   * Entity 속성 값을 변경하는 공통 헬퍼.
   */
  const setAttr = useCallback(
    (name: string, value: unknown) => {
      builderStore.setEntityAttribute(entityId, name, value);
    },
    [builderStore, entityId]
  );

  // --- Row CRUD ---

  /** 새 행을 추가한다. 고유 ID를 자동 생성한다. */
  const addRow = useCallback(() => {
    const newRows: MatrixChoice[] = [
      ...rows,
      { id: createId(), label: { default: '' } },
    ];
    setAttr('rows', newRows);
  }, [rows, setAttr]);

  /** 특정 행의 label을 갱신한다. */
  const updateRowLabel = useCallback(
    (rowId: string, label: I18nString) => {
      const updated = rows.map((r) => (r.id === rowId ? { ...r, label } : r));
      setAttr('rows', updated);
    },
    [rows, setAttr]
  );

  /** 특정 행을 삭제한다. */
  const removeRow = useCallback(
    (rowId: string) => {
      setAttr(
        'rows',
        rows.filter((r) => r.id !== rowId)
      );
    },
    [rows, setAttr]
  );

  // --- Column CRUD ---

  /** 새 열을 추가한다. 고유 ID를 자동 생성한다. */
  const addColumn = useCallback(() => {
    const newCols: MatrixChoice[] = [
      ...columns,
      { id: createId(), label: { default: '' } },
    ];
    setAttr('columns', newCols);
  }, [columns, setAttr]);

  /** 특정 열의 label을 갱신한다. */
  const updateColumnLabel = useCallback(
    (colId: string, label: I18nString) => {
      const updated = columns.map((c) =>
        c.id === colId ? { ...c, label } : c
      );
      setAttr('columns', updated);
    },
    [columns, setAttr]
  );

  /** 특정 열을 삭제한다. */
  const removeColumn = useCallback(
    (colId: string) => {
      setAttr(
        'columns',
        columns.filter((c) => c.id !== colId)
      );
    },
    [columns, setAttr]
  );

  return (
    <ElementComponent
      entityId={entityId}
      entityType="matrix"
      typeLabel={t('surveyEditor.element.types.matrix', 'Matrix')}
      advancedSettings={
        <div className="space-y-3">
          {/* 셔플 옵션 선택 */}
          <div>
            <Label className="mb-1 block text-sm">
              {t('surveyEditor.element.shuffleOption', 'Shuffle Options')}
            </Label>
            <Select
              value={(attrs.shuffleOption as string) ?? 'none'}
              onValueChange={(v) => setAttr('shuffleOption', v)}
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t('surveyEditor.element.shuffleNone', 'None')}
                </SelectItem>
                <SelectItem value="all">
                  {t('surveyEditor.element.shuffleAll', 'All')}
                </SelectItem>
                <SelectItem value="exceptLast">
                  {t('surveyEditor.element.shuffleExceptLast', 'Except Last')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    >
      {/* 질문 제목 (다국어 입력) */}
      <LocalizedInput
        value={attrs.headline as I18nString | undefined}
        onChange={(v) => setAttr('headline', v)}
        label={t('surveyEditor.element.headline', 'Question')}
        placeholder={t(
          'surveyEditor.element.headlinePlaceholder',
          'Enter your question...'
        )}
      />

      {/* 행(Rows) 편집 영역 */}
      <div className="mt-3">
        <Label className="mb-1.5 block text-sm font-medium">
          {t('surveyEditor.element.matrixRows', 'Rows')}
        </Label>
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={row.id} className="flex items-center gap-2">
              <span className="w-5 text-xs text-muted-foreground">
                {index + 1}
              </span>
              <div className="flex-1">
                <LocalizedInput
                  value={row.label}
                  onChange={(v) => updateRowLabel(row.id, v)}
                  placeholder={t(
                    'surveyEditor.element.matrixRowPlaceholder',
                    'Row label...'
                  )}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRow(row.id)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                aria-label={t('surveyEditor.element.removeRow', 'Remove row')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addRow}
          className="mt-2 h-7 text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          {t('surveyEditor.element.addRow', 'Add Row')}
        </Button>
      </div>

      {/* 열(Columns) 편집 영역 */}
      <div className="mt-3">
        <Label className="mb-1.5 block text-sm font-medium">
          {t('surveyEditor.element.matrixColumns', 'Columns')}
        </Label>
        <div className="space-y-2">
          {columns.map((col, index) => (
            <div key={col.id} className="flex items-center gap-2">
              <span className="w-5 text-xs text-muted-foreground">
                {index + 1}
              </span>
              <div className="flex-1">
                <LocalizedInput
                  value={col.label}
                  onChange={(v) => updateColumnLabel(col.id, v)}
                  placeholder={t(
                    'surveyEditor.element.matrixColumnPlaceholder',
                    'Column label...'
                  )}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeColumn(col.id)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                aria-label={t(
                  'surveyEditor.element.removeColumn',
                  'Remove column'
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addColumn}
          className="mt-2 h-7 text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          {t('surveyEditor.element.addColumn', 'Add Column')}
        </Button>
      </div>
    </ElementComponent>
  );
});
