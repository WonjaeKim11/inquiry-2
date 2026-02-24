'use client';

import { type ReactNode } from 'react';
import { SurveyMenuBar } from './SurveyMenuBar';
import { EditorTabs } from './EditorTabs';

interface SurveyEditorLayoutProps {
  /** Editor 영역에 렌더링할 콘텐츠 (탭별 뷰) */
  editorContent: ReactNode;
  /** Preview 영역에 렌더링할 콘텐츠 */
  previewContent: ReactNode;
  /** 뒤로가기 버튼 클릭 시 이동할 URL */
  backUrl: string;
  /** 수동 저장을 트리거하는 콜백 (SurveyMenuBar에 전달) */
  onSave?: () => Promise<void>;
  /** 발행을 트리거하는 콜백 (SurveyMenuBar에 전달) */
  onPublish?: () => Promise<void>;
}

/**
 * 설문 편집기 3분할 레이아웃.
 *
 * 영역 구성:
 * - 상단: SurveyMenuBar (뒤로가기, 이름 편집, 자동 저장 표시기, 액션 버튼)
 * - 좌측 (2/3): EditorTabs + editorContent (탭별 편집 콘텐츠)
 * - 우측 (1/3): previewContent (설문 미리보기)
 *
 * 반응형 동작:
 * - md(768px) 이상: 편집 영역(2/3)과 프리뷰 영역(1/3) 나란히 배치
 * - md 미만: 프리뷰 영역이 숨겨지고 편집 영역이 전체 너비를 차지
 *
 * @param editorContent - 편집 영역에 렌더링할 React 노드
 * @param previewContent - 프리뷰 영역에 렌더링할 React 노드
 * @param backUrl - 뒤로가기 버튼의 목적지 URL
 * @param onSave - 수동 저장 콜백 (SurveyMenuBar로 전달)
 * @param onPublish - 발행 콜백 (SurveyMenuBar로 전달)
 */
export function SurveyEditorLayout({
  editorContent,
  previewContent,
  backUrl,
  onSave,
  onPublish,
}: SurveyEditorLayoutProps) {
  return (
    <div className="flex h-screen flex-col">
      {/* 상단 메뉴바 */}
      <SurveyMenuBar backUrl={backUrl} onSave={onSave} onPublish={onPublish} />

      {/* 메인 영역: 편집기 + 프리뷰 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 편집 영역 (md 이상에서 2/3, md 미만에서 전체 너비) */}
        <div className="flex w-full flex-col overflow-y-auto md:w-2/3">
          <EditorTabs />
          <div className="flex-1 p-4">{editorContent}</div>
        </div>

        {/* 프리뷰 영역 (md 이상에서만 1/3로 표시, md 미만에서 숨김) */}
        <div className="hidden border-l bg-muted/30 md:block md:w-1/3">
          <div className="h-full overflow-y-auto p-4">{previewContent}</div>
        </div>
      </div>
    </div>
  );
}
