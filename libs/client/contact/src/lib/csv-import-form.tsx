'use client';

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@inquiry/client-ui';
import { importCsvContacts, type CsvImportResult } from './contact-api';
import { CsvImportResult as CsvImportResultView } from './csv-import-result';

interface CsvImportFormProps {
  envId: string;
}

/**
 * CSV 파일 업로드 + 중복 전략 선택 폼 컴포넌트.
 * 파일 선택, 중복 처리 전략 설정, 업로드 후 결과 표시를 담당한다.
 */
export function CsvImportForm({ envId }: CsvImportFormProps) {
  const { t } = useTranslation('translation');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [strategy, setStrategy] = useState<'skip' | 'update' | 'overwrite'>(
    'skip'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** CSV Import 폼 제출 처리 */
  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await importCsvContacts(envId, file, strategy);
      if (res.ok && res.data) {
        setResult(res.data);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError(res.message ?? t('contact.errors.csv_max_records'));
      }
    } catch {
      setError(t('contact.errors.csv_max_records'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        {/* 파일 업로드 */}
        <div className="space-y-4">
          <div
            className="flex items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/30"
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="text-sm text-muted-foreground">
              {file ? file.name : t('contact.import.upload_area')}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
          />

          {/* 중복 전략 선택 */}
          <div className="space-y-2">
            <Label>{t('contact.import.strategy_label')}</Label>
            <Select
              value={strategy}
              onValueChange={(v) =>
                setStrategy(v as 'skip' | 'update' | 'overwrite')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">
                  {t('contact.import.strategy_skip')}
                </SelectItem>
                <SelectItem value="update">
                  {t('contact.import.strategy_update')}
                </SelectItem>
                <SelectItem value="overwrite">
                  {t('contact.import.strategy_overwrite')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 에러 메시지 */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* 제출 버튼 */}
          <Button
            onClick={handleSubmit}
            disabled={!file || loading}
            className="w-full"
          >
            {loading
              ? t('contact.import.processing')
              : t('contact.import.submit')}
          </Button>
        </div>
      </Card>

      {/* 결과 표시 */}
      {result && <CsvImportResultView result={result} />}
    </div>
  );
}
