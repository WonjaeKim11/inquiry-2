# FSD-011 Phase 2: shadcn/ui 프리미티브 컴포넌트 추가

## Overview
설문 빌더 UI에서 필요한 인터랙션 패턴(슬라이더 값 조정, 팝오버 메뉴, 접을 수 있는 섹션, 툴팁 안내)을 지원하기 위해 `@inquiry/client-ui` 패키지에 shadcn/ui 스타일 프리미티브 컴포넌트 4개를 추가하였다. 기존 프로젝트의 Radix UI + Tailwind CSS 기반 패턴을 동일하게 따른다.

## Changed Files

### 생성된 파일
- `libs/client/ui/src/components/ui/slider.tsx` — Radix UI Slider 기반 슬라이더 컴포넌트
- `libs/client/ui/src/components/ui/popover.tsx` — Radix UI Popover 기반 팝오버 컴포넌트 (Root, Trigger, Content, Anchor)
- `libs/client/ui/src/components/ui/collapsible.tsx` — Radix UI Collapsible 기반 접을 수 있는 섹션 컴포넌트
- `libs/client/ui/src/components/ui/tooltip.tsx` — Radix UI Tooltip 기반 툴팁 컴포넌트 (Provider, Root, Trigger, Content)

### 수정된 파일
- `libs/client/ui/src/index.ts` — 새로 추가된 4개 컴포넌트의 export 추가
- `libs/client/ui/package.json` — Radix UI 패키지 4개(`react-slider`, `react-popover`, `react-collapsible`, `react-tooltip`) 및 `react-colorful` 의존성 추가
- `pnpm-lock.yaml` — 락파일 자동 갱신

## Major Changes

### 컴포넌트 구현 패턴
모든 컴포넌트는 기존 프로젝트의 shadcn/ui 패턴을 따른다:
- `'use client'` 지시어로 클라이언트 컴포넌트 명시
- Radix UI 프리미티브를 기반으로 스타일링
- `cn()` 유틸리티로 Tailwind CSS 클래스 병합
- `React.forwardRef`로 ref 전달 지원 (Slider, PopoverContent, TooltipContent)
- 애니메이션은 Tailwind CSS의 `animate-in/animate-out` 클래스 활용

### 의존성 추가
`package.json`에 알파벳 순서를 유지하며 5개 패키지를 추가:
```json
"@radix-ui/react-collapsible": "^1.1.11",
"@radix-ui/react-popover": "^1.1.14",
"@radix-ui/react-slider": "^1.3.5",
"@radix-ui/react-tooltip": "^1.2.7",
"react-colorful": "^5.6.1"
```

## How to use it

### Slider
```tsx
import { Slider } from '@inquiry/client-ui';

<Slider defaultValue={[50]} max={100} step={1} />
```

### Popover
```tsx
import { Popover, PopoverTrigger, PopoverContent } from '@inquiry/client-ui';

<Popover>
  <PopoverTrigger>열기</PopoverTrigger>
  <PopoverContent>팝오버 내용</PopoverContent>
</Popover>
```

### Collapsible
```tsx
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@inquiry/client-ui';

<Collapsible>
  <CollapsibleTrigger>토글</CollapsibleTrigger>
  <CollapsibleContent>접을 수 있는 내용</CollapsibleContent>
</Collapsible>
```

### Tooltip
```tsx
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@inquiry/client-ui';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>마우스를 올려보세요</TooltipTrigger>
    <TooltipContent>
      <p>툴팁 내용</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Related Components/Modules
- `libs/client/ui/src/lib/utils.ts` — `cn()` 유틸리티 함수 (클래스 병합)
- 기존 shadcn/ui 컴포넌트들 (Button, Dialog, Select 등)과 동일 패턴
- `react-colorful`은 이번 Phase에서는 직접 사용하지 않으나, 이후 Phase에서 색상 선택기 구현 시 사용 예정

## Precautions
- `TooltipProvider`는 앱 루트 또는 툴팁을 사용하는 영역의 상위에 한 번만 래핑하면 하위 모든 `Tooltip`에 적용된다
- Popover와 Tooltip의 애니메이션 클래스(`animate-in`, `fade-in-0` 등)는 `tailwindcss-animate` 플러그인이 설정되어 있어야 동작한다
- Collapsible 컴포넌트는 별도 스타일링 없이 Radix UI 프리미티브를 그대로 re-export하므로, 필요에 따라 커스텀 스타일을 적용해야 한다
