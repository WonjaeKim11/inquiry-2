'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';

/** 환경 권한 입력 행 하나의 상태 */
interface EnvironmentPermissionRow {
  environmentId: string;
  permission: 'READ' | 'WRITE' | 'MANAGE';
}

/**
 * API Key 생성 다이얼로그.
 * 라벨, 환경 권한(여러 행 추가 가능), 만료일(선택)을 입력받아
 * API Key를 생성하고, 성공 시 평문 키를 부모에게 전달한다.
 */
export function CreateApiKeyDialog({
  organizationId,
  open,
  onOpenChange,
  onCreated,
}: {
  /** 대상 조직 ID */
  organizationId: string;
  /** 다이얼로그 열림/닫힘 상태 */
  open: boolean;
  /** 열림/닫힘 상태 변경 핸들러 */
  onOpenChange: (open: boolean) => void;
  /** 생성 성공 시 평문 키를 전달하는 콜백 */
  onCreated: (result: { plainKey: string }) => void;
}) {
  const { t } = useTranslation();

  const [label, setLabel] = useState('');
  const [environmentPermissions, setEnvironmentPermissions] = useState<
    EnvironmentPermissionRow[]
  >([{ environmentId: '', permission: 'READ' }]);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 환경 권한 행 추가 */
  const addPermissionRow = () => {
    setEnvironmentPermissions((prev) => [
      ...prev,
      { environmentId: '', permission: 'READ' },
    ]);
  };

  /** 환경 권한 행 삭제. 최소 1행은 유지한다 */
  const removePermissionRow = (index: number) => {
    if (environmentPermissions.length <= 1) return;
    setEnvironmentPermissions((prev) => prev.filter((_, i) => i !== index));
  };

  /** 환경 권한 행의 필드 값 변경 */
  const updatePermissionRow = (
    index: number,
    field: keyof EnvironmentPermissionRow,
    value: string
  ) => {
    setEnvironmentPermissions((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  /** 폼 유효성 검사: 라벨 필수, 모든 환경 ID 필수 */
  const isValid =
    label.trim() !== '' &&
    environmentPermissions.every((ep) => ep.environmentId.trim() !== '');

  /**
   * API Key 생성 요청을 서버에 보낸다.
   * 성공 시 다이얼로그를 닫고 평문 키를 부모에 전달한다.
   */
  const handleSubmit = async () => {
    if (!isValid) return;

    setError(null);
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        label: label.trim(),
        environmentPermissions: environmentPermissions.map((ep) => ({
          environmentId: ep.environmentId.trim(),
          permission: ep.permission,
        })),
      };

      // 만료일이 입력된 경우에만 포함
      if (expiresAt) {
        body.expiresAt = new Date(expiresAt).toISOString();
      }

      const res = await apiFetch(`/organizations/${organizationId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('apiKey.create.fail'));
      }

      const result = await res.json();
      // 폼 상태 초기화
      resetForm();
      onOpenChange(false);
      onCreated({ plainKey: result.plainKey });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('apiKey.create.fail'));
    } finally {
      setLoading(false);
    }
  };

  /** 폼 상태를 초기값으로 되돌린다 */
  const resetForm = () => {
    setLabel('');
    setEnvironmentPermissions([{ environmentId: '', permission: 'READ' }]);
    setExpiresAt('');
    setError(null);
  };

  /** 다이얼로그가 닫힐 때 폼을 초기화한다 */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('apiKey.create.title')}</DialogTitle>
          <DialogDescription>{t('apiKey.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 라벨 입력 */}
          <div className="space-y-2">
            <Label htmlFor="api-key-label">{t('apiKey.create.label')}</Label>
            <Input
              id="api-key-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('apiKey.create.label_placeholder')}
              autoComplete="off"
            />
          </div>

          {/* 환경 권한 목록 */}
          <div className="space-y-3">
            <Label>{t('apiKey.list.environments')}</Label>
            {environmentPermissions.map((row, index) => (
              <div key={index} className="flex items-end gap-2">
                {/* 환경 ID 입력 */}
                <div className="flex-1 space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">
                      {t('apiKey.create.environment_id')}
                    </Label>
                  )}
                  <Input
                    type="text"
                    value={row.environmentId}
                    onChange={(e) =>
                      updatePermissionRow(
                        index,
                        'environmentId',
                        e.target.value
                      )
                    }
                    placeholder={t('apiKey.create.environment_id_placeholder')}
                    autoComplete="off"
                  />
                </div>

                {/* 권한 선택 */}
                <div className="w-32 space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">
                      {t('apiKey.create.permission')}
                    </Label>
                  )}
                  <Select
                    value={row.permission}
                    onValueChange={(value) =>
                      updatePermissionRow(index, 'permission', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="READ">
                        {t('apiKey.permission.READ')}
                      </SelectItem>
                      <SelectItem value="WRITE">
                        {t('apiKey.permission.WRITE')}
                      </SelectItem>
                      <SelectItem value="MANAGE">
                        {t('apiKey.permission.MANAGE')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 행 삭제 버튼 — 2행 이상일 때만 표시 */}
                {environmentPermissions.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removePermissionRow(index)}
                  >
                    {t('apiKey.create.remove_permission')}
                  </Button>
                )}
              </div>
            ))}

            {/* 환경 권한 행 추가 버튼 */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPermissionRow}
            >
              {t('apiKey.create.add_permission')}
            </Button>
          </div>

          {/* 만료일 입력 (선택) */}
          <div className="space-y-2">
            <Label htmlFor="api-key-expires">
              {t('apiKey.create.expires_at')}
            </Label>
            <Input
              id="api-key-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              placeholder={t('apiKey.create.expires_at_placeholder')}
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {t('apiKey.delete.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || loading}>
            {loading ? t('apiKey.create.creating') : t('apiKey.create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
