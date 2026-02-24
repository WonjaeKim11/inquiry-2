'use client';

import { useState, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useTranslation } from 'react-i18next';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Input,
  Label,
} from '@inquiry/client-ui';
import type { ColorPickerProps } from '../types';

/**
 * 색상 피커 컴포넌트.
 * react-colorful HexColorPicker + Popover로 구성.
 * light/dark 색상 입력을 지원한다.
 */
export function ColorPicker({
  value,
  onChange,
  darkModeEnabled = false,
  label,
}: ColorPickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const lightValue = value?.light ?? '';
  const darkValue = value?.dark ?? '';

  /** light 색상 변경 핸들러 */
  const handleLightChange = useCallback(
    (color: string) => {
      onChange({ light: color, dark: darkModeEnabled ? darkValue : undefined });
    },
    [onChange, darkModeEnabled, darkValue]
  );

  /** dark 색상 변경 핸들러 */
  const handleDarkChange = useCallback(
    (color: string) => {
      onChange({ light: lightValue, dark: color });
    },
    [onChange, lightValue]
  );

  /** 텍스트 입력을 통한 light 색상 변경 */
  const handleLightInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      onChange({ light: v, dark: darkModeEnabled ? darkValue : undefined });
    },
    [onChange, darkModeEnabled, darkValue]
  );

  /** 텍스트 입력을 통한 dark 색상 변경 */
  const handleDarkInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ light: lightValue, dark: e.target.value });
    },
    [onChange, lightValue]
  );

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex flex-col gap-2">
        {/* Light 색상 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10">
            {t('project.styling.light_value', 'Light')}
          </span>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-8 w-8 rounded-md border border-input shadow-sm cursor-pointer"
                style={{ backgroundColor: lightValue || '#ffffff' }}
                aria-label={label ?? 'Color picker'}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <HexColorPicker
                color={lightValue || '#ffffff'}
                onChange={handleLightChange}
              />
            </PopoverContent>
          </Popover>
          <Input
            type="text"
            value={lightValue}
            onChange={handleLightInput}
            placeholder="#000000"
            className="h-8 flex-1 font-mono text-xs"
          />
        </div>

        {/* Dark 색상 (darkModeEnabled일 때만 표시) */}
        {darkModeEnabled && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10">
              {t('project.styling.dark_value', 'Dark')}
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 rounded-md border border-input shadow-sm cursor-pointer"
                  style={{ backgroundColor: darkValue || '#000000' }}
                  aria-label={`${label ?? 'Color'} dark`}
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <HexColorPicker
                  color={darkValue || '#000000'}
                  onChange={handleDarkChange}
                />
              </PopoverContent>
            </Popover>
            <Input
              type="text"
              value={darkValue}
              onChange={handleDarkInput}
              placeholder="#000000"
              className="h-8 flex-1 font-mono text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
