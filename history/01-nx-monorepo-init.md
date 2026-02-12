# Nx Monorepo 초기화

**날짜**: 2026-02-12
**커밋**: `82fd5cb`, `e1895f0`

## 목표

`/home/superstart/projects/inquiry` 디렉토리를 Nx 모노레포로 초기화.
구조: client (Next.js 16) + server (NestJS 11) + db (Prisma/PostgreSQL)

## 수행 내역

### Step 1-2: Nx 워크스페이스 생성 및 파일 복사
- `/tmp`에서 `create-nx-workspace@latest` (preset=ts, pm=pnpm) 실행
- 생성된 파일을 프로젝트 디렉토리로 복사 (node_modules, pnpm-lock.yaml, .git 제외)
- 기존 `.agents/`, `.claude/` 디렉토리 보존

### Step 3-5: 기본 설정 조정
- `package.json` name을 `@inquiry/source`로 변경
- `pnpm-workspace.yaml`에 `apps/*` 경로 추가
- `.gitignore`에 `.next/`, `dist/`, `.env` 관련 항목 추가

### Step 6-7: 앱 생성
- **@inquiry/client**: `@nx/next:app` (App Router + Tailwind CSS)
- **@inquiry/server**: `@nx/nest:app` (strict mode, webpack)
- **@inquiry/db**: `@nx/js:lib` (minimal)

### Step 8: Prisma 설정
- `prisma init --datasource-provider postgresql`
- generator를 `prisma-client-js`로 설정 (초기 `prisma-client` v6+는 driver adapter 필수라 호환성 문제)
- 싱글톤 PrismaClient 패턴 (`packages/db/src/lib/db.ts`)

### Step 9: 패키지 간 의존성 연결
- `apps/client`, `apps/server` → `@inquiry/db: workspace:*` 의존성 추가
- `nx sync`로 TypeScript project references 동기화

### Step 10: Git 초기화 및 커밋

## 최종 구조

```
inquiry/
├── apps/
│   ├── client/          # Next.js 16 + Tailwind CSS
│   └── server/          # NestJS 11
├── packages/
│   └── db/              # Prisma + PostgreSQL
├── nx.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── .gitignore
```

## 빌드 검증

| 프로젝트 | 결과 |
|---------|------|
| @inquiry/db | 성공 (tsc) |
| @inquiry/client | 성공 (Next.js Turbopack) |
| @inquiry/server | 성공 (Webpack) |

## 주요 결정 사항

1. **Prisma generator**: `prisma-client` (v6+) → `prisma-client-js`로 변경
   - 이유: 새 generator는 `adapter` 또는 `accelerateUrl` 필수, 기존 DATABASE_URL 방식 비호환
2. **Tailwind CSS**: `--style=tailwind` 옵션 사용 (v3 설치됨, v4는 별도 마이그레이션 필요)
3. **pnpm-workspace.yaml**: `onlyBuiltDependencies` 설정 추가 (@swc/core, nx 등)
