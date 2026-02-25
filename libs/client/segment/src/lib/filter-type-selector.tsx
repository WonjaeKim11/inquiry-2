'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@inquiry/client-ui';
import type {
  FilterResource,
  FilterType,
  DeviceType,
} from '@inquiry/shared-segment';
import { fetchAttributeKeys, type AttributeKey } from '@inquiry/client-contact';
import { fetchSegments, type SegmentItem } from './segment-api';

interface FilterTypeSelectorProps {
  resource: FilterResource;
  attributeKey?: string;
  filterType?: FilterType;
  segmentId?: string;
  deviceType?: DeviceType;
  envId: string;
  onResourceChange: (resource: FilterResource) => void;
  onAttributeChange: (key: string, type: FilterType) => void;
  onSegmentChange: (id: string) => void;
  onDeviceChange: (type: DeviceType) => void;
}

/**
 * 필터 타입(리소스) 선택 컴포넌트.
 * 리소스 유형에 따라 속성 키, 세그먼트, 디바이스 하위 선택을 제공한다.
 */
export function FilterTypeSelector({
  resource,
  attributeKey,
  segmentId,
  deviceType,
  envId,
  onResourceChange,
  onAttributeChange,
  onSegmentChange,
  onDeviceChange,
}: FilterTypeSelectorProps) {
  const { t } = useTranslation('translation');
  const [attributeKeys, setAttributeKeys] = useState<AttributeKey[]>([]);
  const [segments, setSegments] = useState<SegmentItem[]>([]);

  /* 리소스 유형이 변경되면 해당 유형에 필요한 데이터를 로드 */
  useEffect(() => {
    if (resource === 'attribute') {
      fetchAttributeKeys(envId).then(({ data }) => setAttributeKeys(data));
    } else if (resource === 'segment') {
      fetchSegments(envId).then(({ data }) => setSegments(data));
    }
  }, [resource, envId]);

  /** DB dataType → 필터 filterType 매핑 */
  const mapDataType = (dataType: string): FilterType => {
    switch (dataType) {
      case 'NUMBER':
        return 'number';
      case 'DATE':
        return 'date';
      default:
        return 'string';
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* 리소스 유형 선택 */}
      <Select
        value={resource}
        onValueChange={(v) => onResourceChange(v as FilterResource)}
      >
        <SelectTrigger className="w-[120px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="attribute">
            {t('segment.filter.type_attribute')}
          </SelectItem>
          <SelectItem value="person">
            {t('segment.filter.type_person')}
          </SelectItem>
          <SelectItem value="segment">
            {t('segment.filter.type_segment')}
          </SelectItem>
          <SelectItem value="device">
            {t('segment.filter.type_device')}
          </SelectItem>
        </SelectContent>
      </Select>

      {/* 속성 키 선택 (attribute 리소스일 때) */}
      {resource === 'attribute' && (
        <Select
          value={attributeKey ?? ''}
          onValueChange={(key) => {
            const found = attributeKeys.find((ak) => ak.key === key);
            if (found) onAttributeChange(key, mapDataType(found.dataType));
          }}
        >
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder={t('segment.filter.select_attribute')} />
          </SelectTrigger>
          <SelectContent>
            {attributeKeys.map((ak) => (
              <SelectItem key={ak.id} value={ak.key}>
                {ak.name || ak.key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 세그먼트 선택 (segment 리소스일 때) */}
      {resource === 'segment' && (
        <Select
          value={segmentId ?? ''}
          onValueChange={(id) => onSegmentChange(id)}
        >
          <SelectTrigger className="w-[160px] h-8">
            <SelectValue placeholder={t('segment.filter.select_segment')} />
          </SelectTrigger>
          <SelectContent>
            {segments.map((seg) => (
              <SelectItem key={seg.id} value={seg.id}>
                {seg.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 디바이스 유형 선택 (device 리소스일 때) */}
      {resource === 'device' && (
        <Select
          value={deviceType ?? ''}
          onValueChange={(type) => onDeviceChange(type as DeviceType)}
        >
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue placeholder={t('segment.filter.select_device')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desktop">
              {t('segment.filter.device_desktop')}
            </SelectItem>
            <SelectItem value="phone">
              {t('segment.filter.device_phone')}
            </SelectItem>
            <SelectItem value="tablet">
              {t('segment.filter.device_tablet')}
            </SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
