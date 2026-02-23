# FSD-004 멤버 초대/RBAC 클라이언트 사이드 구현

## Overview
멤버 초대 및 역할 기반 접근 제어(RBAC) 기능의 클라이언트 사이드를 구현한다.
이미 구현 완료된 백엔드 API(초대 CRUD, 멤버 관리, 조직 탈퇴)를 호출하는
React 컴포넌트 라이브러리와 Next.js 페이지 라우트를 추가하여,
조직 소유자/관리자가 새 멤버를 초대하고 기존 멤버의 역할을 관리할 수 있게 한다.

## Changed Files

### 신규 생성 - `@inquiry/client-member` 패키지
- `libs/client/member/package.json` - 패키지 메타데이터 및 의존성 정의
- `libs/client/member/tsconfig.json` - TypeScript 프로젝트 참조 설정
- `libs/client/member/tsconfig.lib.json` - 라이브러리 빌드 설정
- `libs/client/member/src/index.ts` - 배럴 export 파일
- `libs/client/member/src/lib/role-badge.tsx` - 역할별 색상 배지 컴포넌트
- `libs/client/member/src/lib/invite-member-form.tsx` - 멤버 초대 폼 컴포넌트
- `libs/client/member/src/lib/invite-list.tsx` - 대기 중인 초대 목록 컴포넌트
- `libs/client/member/src/lib/member-list.tsx` - 멤버 목록 및 역할 관리 컴포넌트
- `libs/client/member/src/lib/leave-organization-dialog.tsx` - 조직 탈퇴 확인 다이얼로그

### 신규 생성 - 페이지 라우트
- `apps/client/src/app/[lng]/organizations/[orgId]/members/page.tsx` - 멤버 관리 페이지
- `apps/client/src/app/[lng]/invite/accept/page.tsx` - 초대 수락 페이지

### 수정 - i18n 번역 키
- `apps/client/src/app/i18n/locales/en-US/translation.json` - 영문 멤버 관련 키 추가
- `apps/client/src/app/i18n/locales/ko-KR/translation.json` - 한국어 멤버 관련 키 추가

### 수정 - 기존 파일
- `apps/client/src/app/[lng]/organizations/[orgId]/settings/page.tsx` - 멤버 관리 링크 버튼 추가
- `apps/client/package.json` - `@inquiry/client-member` 의존성 추가
- `apps/client/tsconfig.json` - client-member 프로젝트 참조 추가
- `tsconfig.json` (루트) - client-member 프로젝트 참조 추가

## Major Changes

### 1. 역할 기반 권한 분기 로직
각 컴포넌트에서 현재 사용자의 역할(currentUserRole)을 기반으로 UI를 분기한다:

```tsx
// invite-member-form.tsx - Owner만 ADMIN 역할 초대 가능
const availableRoles = ASSIGNABLE_ROLES.filter((r) => {
  if (r === 'ADMIN' && currentUserRole !== 'OWNER') return false;
  return true;
});

// member-list.tsx - 역할별 변경 가능 범위 제한
const canChangeRole = (member: Member): boolean => {
  if (member.userId === currentUserId) return false;
  if (currentUserRole === 'OWNER') return true;
  if (currentUserRole === 'ADMIN' &&
      (member.role === 'MEMBER' || member.role === 'BILLING')) return true;
  return false;
};
```

### 2. 멤버 관리 페이지 데이터 흐름
페이지 마운트 시 조직 상세와 멤버 목록을 병렬 조회하여 현재 사용자의 역할을 결정한다.
초대 성공 시 refreshKey 카운터를 증가시켜 자식 컴포넌트 리마운트를 통해 목록을 갱신한다.

### 3. 초대 수락 페이지 Suspense 처리
Next.js 16에서 useSearchParams()는 Suspense 경계 내에서 사용해야 한다.
내부 컴포넌트(InviteAcceptContent)를 분리하고 Suspense로 래핑하여 SSG 호환성을 확보했다.

### 4. 역할 배지 색상 시스템
```tsx
const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-800 border-purple-200',
  ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
  MEMBER: 'bg-green-100 text-green-800 border-green-200',
  BILLING: 'bg-orange-100 text-orange-800 border-orange-200',
};
```

## How to use it

### 멤버 관리 페이지 접근
1. 조직 설정 페이지에서 "멤버" 버튼 클릭
2. URL: `/{lng}/organizations/{orgId}/members`

### 멤버 초대 (Owner/Admin)
1. 멤버 관리 페이지 상단의 초대 폼에서 이메일, 이름, 역할 입력
2. "초대 보내기" 클릭
3. 초대 대상에게 이메일 발송됨

### 초대 수락
1. 초대 이메일의 링크 클릭 (URL: `/{lng}/invite/accept?token=xxx`)
2. 자동으로 초대 수락 처리
3. 성공 시 조직 멤버 관리 페이지로 이동 가능

### 역할 변경 (Owner/Admin)
1. 멤버 목록 탭에서 대상 멤버의 "역할 변경" 드롭다운 클릭
2. 변경할 역할 선택

### 조직 탈퇴
1. 멤버 관리 페이지 하단의 "탈퇴" 버튼 클릭
2. 확인 다이얼로그에서 "탈퇴" 클릭

## Related Components/Modules
- `@inquiry/client-core` - apiFetch, useAuth 등 인증 기반 API 호출
- `@inquiry/client-organization` - 조직 컨텍스트(useOrganization, refreshOrganizations)
- `@inquiry/client-ui` - Badge, Button, Card, Dialog, DropdownMenu, Tabs 등 UI 컴포넌트
- 백엔드 API: `libs/server/invite/`, `libs/server/member/`, `libs/server/rbac/`

## Precautions
- 현재 사용자의 역할은 멤버 목록 API 응답에서 userId 매칭으로 추출한다.
  별도 "내 역할 조회" API가 추가되면 더 효율적으로 개선할 수 있다.
- 초대 수락 페이지는 인증 여부와 무관하게 접근 가능하나,
  서버에서 토큰 유효성과 인증 상태를 함께 검증한다.
- Owner 탈퇴 불가 로직은 서버와 클라이언트 양쪽에서 이중 검증한다.
- 멤버 삭제/역할 변경 시 window.confirm을 사용하므로, 추후 커스텀 확인 다이얼로그로 교체를 권장한다.
