'use client';

import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, Badge } from '@inquiry/client-ui';
import { useEditorUI } from '../../hooks/use-editor-ui';
import type { EditorTab } from '../../context/types';

/**
 * 편집기 4탭 전환 컴포넌트.
 *
 * 탭별 표시 조건:
 * - Elements: 항상 표시
 * - Styling: editorConfig.isStyleOverrideAllowed가 true일 때만 표시
 * - Settings: editorConfig.isCxMode가 false일 때만 표시
 * - FollowUps: 항상 표시 (Pro 배지 포함)
 *
 * 탭 전환 시 useEditorUI의 setActiveTab을 통해 EditorUIContext의 activeTab 상태를 업데이트한다.
 */
export function EditorTabs() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, editorConfig } = useEditorUI();
  const { isCxMode, isStyleOverrideAllowed } = editorConfig;

  /**
   * 탭 변경 핸들러.
   * Radix Tabs의 onValueChange에서 전달받은 string 값을 EditorTab 타입으로 캐스팅하여 상태를 업데이트한다.
   */
  const handleTabChange = (value: string) => {
    setActiveTab(value as EditorTab);
  };

  return (
    <div className="border-b px-4">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="h-10">
          {/* Elements 탭 — 항상 표시 */}
          <TabsTrigger value="elements">
            {t('surveyEditor.tabs.elements', 'Elements')}
          </TabsTrigger>

          {/* Styling 탭 — 스타일 오버라이드가 허용된 경우에만 표시 */}
          {isStyleOverrideAllowed && (
            <TabsTrigger value="styling">
              {t('surveyEditor.tabs.styling', 'Styling')}
            </TabsTrigger>
          )}

          {/* Settings 탭 — CX 모드가 아닐 때만 표시 */}
          {!isCxMode && (
            <TabsTrigger value="settings">
              {t('surveyEditor.tabs.settings', 'Settings')}
            </TabsTrigger>
          )}

          {/* FollowUps 탭 — 항상 표시, Pro 배지 포함 */}
          <TabsTrigger value="followUps" className="flex items-center gap-1.5">
            {t('surveyEditor.tabs.followUps', 'Follow-Ups')}
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {t('surveyEditor.tabs.proBadge', 'Pro')}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
