# shadcn/ui 도입 및 기존 인증 화면 마이그레이션

## Overview
프로젝트에 shadcn/ui 기반의 공유 UI 컴포넌트 라이브러리(`@inquiry/client-ui`)를 도입하였다.
기존 인증 화면 중 Tailwind CSS만 사용하던 `login-form`, `signup-form`, `social-login-buttons`에 shadcn 컴포넌트를 적용하고,
인라인 스타일을 사용하던 `forgot-password-form`, `reset-password-form`, `verify-email`, `logout-page`, `auth-callback` 5개 화면을 전면 리스타일하여 디자인 일관성을 확보하였다.

## Changed Files

### 신규 생성 (UI 라이브러리)
| 파일 | 역할 |
|------|------|
| `libs/client/ui/package.json` | `@inquiry/client-ui` 패키지 정의 |
| `libs/client/ui/tsconfig.json` | TypeScript 프로젝트 설정 (루트) |
| `libs/client/ui/tsconfig.lib.json` | TypeScript 라이브러리 빌드 설정 |
| `libs/client/ui/src/lib/utils.ts` | `cn()` 유틸리티 (clsx + tailwind-merge) |
| `libs/client/ui/src/components/ui/button.tsx` | Button 컴포넌트 (variant, size, asChild 지원) |
| `libs/client/ui/src/components/ui/input.tsx` | Input 컴포넌트 |
| `libs/client/ui/src/components/ui/label.tsx` | Label 컴포넌트 (Radix UI 기반) |
| `libs/client/ui/src/components/ui/card.tsx` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| `libs/client/ui/src/components/ui/alert.tsx` | Alert, AlertTitle, AlertDescription (destructive variant) |
| `libs/client/ui/src/components/ui/separator.tsx` | Separator 컴포넌트 (Radix UI 기반) |
| `libs/client/ui/src/index.ts` | barrel export |

### 수정 (설정 파일)
| 파일 | 변경 내용 |
|------|-----------|
| `apps/client/package.json` | `@inquiry/client-ui`, `tailwindcss-animate` 의존성 추가 |
| `libs/client/auth/package.json` | `@inquiry/client-ui` 의존성 추가 |
| `apps/client/tsconfig.json` | `libs/client/ui` reference 추가 |
| `libs/client/auth/tsconfig.lib.json` | `../ui/tsconfig.lib.json` reference 추가 |
| `apps/client/tailwind.config.js` | CSS 변수 기반 색상, borderRadius, tailwindcss-animate 플러그인 추가 |
| `apps/client/src/app/global.css` | CSS 커스텀 속성(`--primary`, `--border` 등), `border-border`, `bg-background text-foreground` 추가 |

### 수정 (컴포넌트 마이그레이션)
| 파일 | 변경 내용 |
|------|-----------|
| `libs/client/auth/src/lib/login-form.tsx` | `<input>` → `<Input>`, `<button>` → `<Button>`, 에러 div → `<Alert>`, Card 래핑 |
| `libs/client/auth/src/lib/signup-form.tsx` | 동일 패턴, 성공 상태도 Card 기반, `<Button asChild>` 사용 |
| `libs/client/auth/src/lib/social-login-buttons.tsx` | 구분선 → `<Separator>`, 소셜 버튼 → `<Button variant="outline">` |
| `libs/client/auth/src/lib/forgot-password-form.tsx` | 인라인 style 전면 제거, Card+Input+Label+Button+Alert 적용 |
| `libs/client/auth/src/lib/reset-password-form.tsx` | 인라인 style 전면 제거, Card 기반 레이아웃 |
| `libs/client/auth/src/lib/verify-email.tsx` | 인라인 style 전면 제거, 상태별 UI (스피너/성공/에러) Card 기반 |
| `libs/client/auth/src/lib/logout-page.tsx` | 인라인 style 전면 제거, 로딩 스피너/완료 Card 기반 |
| `libs/client/auth/src/lib/auth-callback.tsx` | 인라인 style 전면 제거, 에러 Card+Alert, 처리 중 스피너 |
| `apps/client/src/app/[lng]/page.tsx` | `text-gray-500` → `text-muted-foreground` |

## Major Changes

### 1. CSS 변수 기반 테마 시스템
`global.css`에 shadcn 표준 CSS 커스텀 속성을 추가하여, 기존 teal/slate 색상 체계를 유지하면서 CSS 변수 기반으로 전환:
- `--primary: 222.2 47.4% 11.2%` (slate-900, 기존 버튼 배경)
- `--accent: 166 100% 45%` (teal-500, #00E5B5 계열)
- `--border / --input: 214.3 31.8% 91.4%` (slate-200)

### 2. `cn()` 유틸리티
`clsx`로 조건부 클래스를 결합한 뒤 `tailwind-merge`로 중복을 해소하는 함수. 모든 shadcn 컴포넌트에서 `className` prop을 받아 기본 스타일과 병합할 때 사용.

### 3. 인라인 스타일 → shadcn 전면 전환
`forgot-password-form`, `reset-password-form`, `verify-email`, `logout-page`, `auth-callback`의 인라인 `style={}` 속성을 모두 제거하고, `bg-[#e4f6f3]` 풀스크린 센터 레이아웃 + Card 기반으로 통일.

## How to use it

### UI 컴포넌트 import
```tsx
import { Button, Input, Label, Card, CardHeader, CardContent, Alert, AlertDescription, Separator } from '@inquiry/client-ui';
```

### Button 사용 예시
```tsx
// 기본 버튼
<Button>Submit</Button>

// outline variant
<Button variant="outline">Cancel</Button>

// 링크를 버튼으로 표시 (asChild)
<Button asChild>
  <a href="/auth/login">로그인</a>
</Button>
```

### Card 레이아웃 예시
```tsx
<Card className="w-full max-w-md">
  <CardHeader>
    <CardTitle>제목</CardTitle>
  </CardHeader>
  <CardContent>
    <Input placeholder="이메일" />
  </CardContent>
</Card>
```

## Related Components/Modules
- `@inquiry/client-core` — AuthProvider, useAuth, apiFetch (기존 로직 그대로 사용)
- `apps/client/tailwind.config.js` — CSS 변수 색상이 정의되어야 shadcn 컴포넌트가 올바르게 렌더링됨
- `apps/client/src/app/global.css` — CSS 커스텀 속성의 실제 값이 여기서 정의됨

## Precautions
- shadcn 컴포넌트는 **Tailwind CSS v3** 기반이며, v4로 업그레이드 시 CSS 변수 참조 방식 변경 가능
- `global.css`의 `border-width: 0` 리셋과 shadcn의 `@apply border-border`가 공존하므로, 새 컴포넌트 추가 시 border 스타일 확인 필요
- 비밀번호 유효성 힌트 UI는 shadcn 대응 컴포넌트가 없어 커스텀 유지
