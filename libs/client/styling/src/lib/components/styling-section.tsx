'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@inquiry/client-ui';
import type { StylingSectionProps } from '../types';

/**
 * 스타일링 섹션 래퍼 — Collapsible 기반.
 * 섹션 제목을 클릭하면 내용을 펼치거나 접는다.
 */
export function StylingSection({
  title,
  defaultOpen = false,
  children,
}: StylingSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <span>{title}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-1 pt-3 pb-1">
        <div className="space-y-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
