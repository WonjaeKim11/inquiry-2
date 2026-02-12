# 00. 인프라 설정 명세서

## 1. 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | inquiry |
| 아키텍처 | Nx Monorepo |
| 패키지 매니저 | pnpm v10 |
| Node.js | ES2022 target |
| TypeScript | ~5.9.x (strict mode) |

## 2. 워크스페이스 구조

```
inquiry/
├── apps/
│   ├── client/               # 프론트엔드 애플리케이션
│   └── server/               # 백엔드 애플리케이션
├── packages/
│   └── db/                   # 데이터베이스 클라이언트 라이브러리
├── history/                  # 변경 이력
├── functional-specification/ # 기능명세서
├── nx.json                   # Nx 워크스페이스 설정
├── package.json              # 루트 패키지 (@inquiry/source)
├── pnpm-workspace.yaml       # pnpm 워크스페이스 설정
├── tsconfig.base.json        # 공통 TypeScript 설정
├── tsconfig.json             # 루트 TypeScript 설정
├── .gitignore
├── .prettierrc
└── .env.example
```

## 3. 프로젝트 상세

### 3.1 @inquiry/client

| 항목 | 내용 |
|------|------|
| 경로 | `apps/client/` |
| 프레임워크 | Next.js 16 |
| 빌드 도구 | Turbopack |
| 라우팅 | App Router (`src/app/`) |
| 스타일링 | Tailwind CSS v3 + PostCSS |
| 컴파일러 | SWC |

**주요 파일:**
- `next.config.js` — Next.js 설정
- `tailwind.config.js` — Tailwind CSS 설정
- `postcss.config.js` — PostCSS 설정
- `src/app/layout.tsx` — 루트 레이아웃
- `src/app/page.tsx` — 메인 페이지
- `src/app/global.css` — 글로벌 스타일
- `src/app/api/hello/route.ts` — API 라우트 예제

**Nx targets:**
- `build` — Next.js 프로덕션 빌드
- `dev` — 개발 서버 (Turbopack)
- `start` — 프로덕션 서버

### 3.2 @inquiry/server

| 항목 | 내용 |
|------|------|
| 경로 | `apps/server/` |
| 프레임워크 | NestJS 11 |
| 빌드 도구 | Webpack |
| HTTP 플랫폼 | Express (`@nestjs/platform-express`) |
| 모드 | strict TypeScript |

**주요 파일:**
- `src/main.ts` — 애플리케이션 엔트리포인트
- `src/app/app.module.ts` — 루트 모듈
- `src/app/app.controller.ts` — 루트 컨트롤러
- `src/app/app.service.ts` — 루트 서비스
- `webpack.config.js` — Webpack 설정
- `tsconfig.app.json` — 빌드용 TypeScript 설정

**Nx targets:**
- `build` — Webpack 프로덕션 빌드
- `serve` — 개발 서버 (`@nx/js:node` executor)
- `prune` — 배포용 lockfile/workspace_modules 정리

**주요 의존성:**
- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`
- `reflect-metadata`, `rxjs`, `tslib`

### 3.3 @inquiry/db

| 항목 | 내용 |
|------|------|
| 경로 | `packages/db/` |
| ORM | Prisma (prisma-client-js) |
| 데이터베이스 | PostgreSQL |
| 빌드 | tsc (`tsconfig.lib.json`) |

**주요 파일:**
- `prisma/schema.prisma` — Prisma 스키마
- `prisma.config.ts` — Prisma 설정 (datasource URL, migration 경로)
- `src/lib/db.ts` — PrismaClient 싱글톤 인스턴스
- `src/index.ts` — 패키지 엔트리포인트 (prisma, Prisma, PrismaClient export)

**PrismaClient 싱글톤 패턴:**
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```
- 개발 환경에서 hot-reload 시 커넥션 풀 누수 방지

## 4. 패키지 의존성 그래프

```
@inquiry/client ──→ @inquiry/db
@inquiry/server ──→ @inquiry/db
```

- `apps/client/package.json` 및 `apps/server/package.json`에 `"@inquiry/db": "workspace:*"` 설정
- TypeScript project references는 `nx sync`로 자동 관리

## 5. 빌드 설정

### 5.1 TypeScript 공통 설정 (`tsconfig.base.json`)

| 옵션 | 값 | 설명 |
|------|-----|------|
| target | ES2022 | 런타임 타겟 |
| module | nodenext | ESM 모듈 시스템 |
| moduleResolution | nodenext | Node.js ESM 해석 방식 |
| strict | true | 엄격 타입 체크 |
| composite | true | 프로젝트 참조 지원 |
| skipLibCheck | true | .d.ts 파일 체크 생략 |
| isolatedModules | true | 단일 파일 트랜스파일 보장 |

### 5.2 빌드 명령어

```bash
# 개별 빌드
pnpm exec nx build @inquiry/client
pnpm exec nx build @inquiry/server
pnpm exec nx build @inquiry/db

# 전체 빌드
pnpm exec nx run-many -t build

# 개발 서버
pnpm exec nx dev @inquiry/client     # Next.js 개발 서버
pnpm exec nx serve @inquiry/server   # NestJS 개발 서버
```

### 5.3 빌드 스크립트 허용 목록 (`pnpm-workspace.yaml`)

```yaml
onlyBuiltDependencies:
  - '@swc/core'
  - 'nx'
  - '@parcel/watcher'
  - 'esbuild'
  - 'less'
  - 'sharp'
```

## 6. 환경 변수

### 6.1 .env.example

```
DATABASE_URL="postgresql://user:password@localhost:5432/inquiry?schema=public"
```

### 6.2 환경 변수 관리 규칙

- `.env` 파일은 `.gitignore`에 포함 (커밋 금지)
- `.env.example`만 버전 관리에 포함
- Prisma는 `prisma.config.ts`에서 `process.env["DATABASE_URL"]` 참조

## 7. Git 설정

### 7.1 .gitignore 주요 항목

| 패턴 | 대상 |
|------|------|
| `node_modules` | 의존성 |
| `.next/`, `.next` | Next.js 빌드 캐시 |
| `dist/` | NestJS 빌드 출력 |
| `out/`, `out` | Next.js static export |
| `.env`, `.env.*` | 환경 변수 (`.env.example` 제외) |
| `.nx/cache`, `.nx/workspace-data` | Nx 캐시 |

## 8. 검증 방법

```bash
# 프로젝트 목록 확인
pnpm exec nx show projects
# 기대 결과: @inquiry/client, @inquiry/db, @inquiry/server

# 의존성 그래프 확인
pnpm exec nx graph

# 전체 빌드 검증
pnpm exec nx run-many -t build

# Prisma 클라이언트 생성
cd packages/db && pnpm exec prisma generate
```
