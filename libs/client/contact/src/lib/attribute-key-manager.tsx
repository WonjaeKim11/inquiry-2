'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@inquiry/client-ui';
import {
  fetchAttributeKeys,
  createAttributeKey,
  updateAttributeKey,
  deleteAttributeKey,
  type AttributeKey,
} from './contact-api';

interface AttributeKeyManagerProps {
  envId: string;
}

/**
 * 속성 키 목록/생성/수정/삭제 관리 컴포넌트.
 * DEFAULT(시스템) 속성은 수정/삭제 불가하며, CUSTOM 속성만 관리 가능하다.
 */
export function AttributeKeyManager({ envId }: AttributeKeyManagerProps) {
  const { t } = useTranslation('translation');
  const [keys, setKeys] = useState<AttributeKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<AttributeKey | null>(null);

  // 생성 폼 state
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDataType, setNewDataType] = useState<'STRING' | 'NUMBER' | 'DATE'>(
    'STRING'
  );
  const [createError, setCreateError] = useState('');

  // 수정 폼 state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  /** 속성 키 목록 로드 */
  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAttributeKeys(envId);
      if (result.ok) setKeys(result.data);
    } finally {
      setLoading(false);
    }
  }, [envId]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  /** 새 속성 키 생성 처리 */
  const handleCreate = async () => {
    setCreateError('');
    const result = await createAttributeKey(envId, {
      key: newKey,
      name: newName || undefined,
      description: newDesc || undefined,
      dataType: newDataType,
    });
    if (result.ok) {
      setShowCreate(false);
      setNewKey('');
      setNewName('');
      setNewDesc('');
      setNewDataType('STRING');
      loadKeys();
    } else {
      setCreateError(result.message ?? '');
    }
  };

  /** 기존 속성 키 수정 처리 */
  const handleUpdate = async () => {
    if (!editTarget) return;
    const result = await updateAttributeKey(envId, editTarget.id, {
      name: editName || undefined,
      description: editDesc || undefined,
    });
    if (result.ok) {
      setEditTarget(null);
      loadKeys();
    }
  };

  /** 속성 키 삭제 처리 (confirm 후 진행) */
  const handleDelete = async (keyId: string) => {
    if (!confirm(t('contact.attribute.delete_confirm'))) return;
    const result = await deleteAttributeKey(envId, keyId);
    if (result.ok) loadKeys();
  };

  /** 데이터 타입 라벨 반환 */
  const dataTypeLabel = (dt: string) => {
    switch (dt) {
      case 'STRING':
        return t('contact.attribute.type_string');
      case 'NUMBER':
        return t('contact.attribute.type_number');
      case 'DATE':
        return t('contact.attribute.type_date');
      default:
        return dt;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('contact.attribute.title')}
        </h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          {t('contact.attribute.create')}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {t('contact.import.processing')}
        </p>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <Card
              key={key.id}
              className="flex items-center justify-between p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{key.key}</span>
                  <Badge
                    variant={key.type === 'DEFAULT' ? 'secondary' : 'outline'}
                  >
                    {key.type === 'DEFAULT'
                      ? t('contact.attribute.type_default')
                      : t('contact.attribute.type_custom')}
                  </Badge>
                  <Badge variant="outline">{dataTypeLabel(key.dataType)}</Badge>
                </div>
                {key.name && (
                  <p className="text-sm text-muted-foreground">{key.name}</p>
                )}
              </div>
              {key.type === 'CUSTOM' && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditTarget(key);
                      setEditName(key.name ?? '');
                      setEditDesc(key.description ?? '');
                    }}
                  >
                    {t('contact.attribute.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(key.id)}
                  >
                    {t('contact.delete.submit')}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 생성 다이얼로그 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('contact.attribute.create')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('contact.attribute.key_label')}</Label>
              <Input
                placeholder={t('contact.attribute.key_placeholder')}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('contact.attribute.name_label')}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('contact.attribute.description_label')}</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('contact.attribute.data_type_label')}</Label>
              <Select
                value={newDataType}
                onValueChange={(v) =>
                  setNewDataType(v as 'STRING' | 'NUMBER' | 'DATE')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRING">
                    {t('contact.attribute.type_string')}
                  </SelectItem>
                  <SelectItem value="NUMBER">
                    {t('contact.attribute.type_number')}
                  </SelectItem>
                  <SelectItem value="DATE">
                    {t('contact.attribute.type_date')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              {t('contact.delete.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={!newKey}>
              {t('contact.attribute.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('contact.attribute.edit')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('contact.attribute.name_label')}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('contact.attribute.description_label')}</Label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              {t('contact.delete.cancel')}
            </Button>
            <Button onClick={handleUpdate}>
              {t('contact.attribute.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
