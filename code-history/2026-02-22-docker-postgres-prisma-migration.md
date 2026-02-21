# Docker PostgreSQL 설치, Prisma 첫 마이그레이션, PrismaPg 어댑터 적용

## Overview
프로젝트에 Prisma 스키마(7개 모델, 2개 enum)가 정의되어 있었으나 실제 DB와 마이그레이션이 없는 상태였다.
Docker로 PostgreSQL을 구성하고, Prisma 마이그레이션을 설정하여 개발 DB 환경을 완성했다.

**해결한 문제:**
- `docker-compose.yml` 없음 → PostgreSQL 컨테이너 정의
- `.env` 파일 없음 → `DATABASE_URL` 등 환경변수 설정
- `prisma.config.ts`에서 dotenv가 의존성에 없고, 루트 `.env` 경로가 미지정
- `packages/db/package.json`에 prisma 관련 스크립트 미정의
- 마이그레이션이 한 번도 실행되지 않은 상태
- Prisma 7.x에서 `PrismaPg` 어댑터가 필요하나 미적용 상태
- `cookie-parser`의 ESM default import 및 webpack externals 미설정

## Changed Files

| 구분 | 파일 | 역할 |
|---|---|---|
| 신규 | `docker-compose.yml` | PostgreSQL 17 Alpine 컨테이너 정의 (포트 5432, healthcheck, named volume) |
| 신규 | `.env` | 환경변수 설정 (gitignore 대상) |
| 수정 | `.env.example` | `DATABASE_URL`의 user/password를 docker-compose와 동기화 |
| 수정 | `packages/db/prisma.config.ts` | dotenv로 루트 `.env` 명시적 로드, ESM 호환 경로 계산 |
| 수정 | `packages/db/package.json` | dotenv 의존성 추가, prisma 관련 스크립트 6개 추가, `@prisma/adapter-pg` 의존성 추가 |
| 수정 | `packages/db/src/lib/db.ts` | PrismaPg 어댑터를 사용한 PrismaClient 생성으로 변경 |
| 수정 | `libs/server/prisma/package.json` | `@prisma/adapter-pg`, `@prisma/client` 의존성 추가 |
| 수정 | `libs/server/prisma/src/lib/server-prisma.service.ts` | PrismaPg 어댑터를 통한 DB 연결로 변경 |
| 수정 | `apps/server/src/main.ts` | `cookie-parser` ESM default import 방식으로 수정 |
| 수정 | `apps/server/webpack.config.js` | `cookie-parser`를 externals에 추가 |
| 수정 | `package.json` (루트) | db:*, docker:* 편의 스크립트 추가 |
| 자동생성 | `packages/db/prisma/migrations/20260221162938_init/migration.sql` | 첫 마이그레이션 SQL |
| 자동생성 | `packages/db/prisma/migrations/migration_lock.toml` | DB provider 잠금 (postgresql) |

## Major Changes

### 1. Docker Compose 구성
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17-alpine
    container_name: inquiry-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: inquiry
      POSTGRES_PASSWORD: inquiry_password
      POSTGRES_DB: inquiry
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U inquiry -d inquiry"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

### 2. prisma.config.ts ESM 호환 수정
기존 `import "dotenv/config"` 방식은 monorepo 환경에서 루트 `.env`를 찾지 못할 수 있다.
`import.meta.url` 기반으로 `packages/db` → 루트(`../../.env`)까지의 상대 경로를 계산하여 명시적으로 로드한다.

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

### 3. Prisma 스크립트 체계
`packages/db/package.json`에 6개 스크립트를 추가하고, 루트 `package.json`에서 프록시 스크립트로 접근할 수 있게 했다.

| 스크립트 | 명령어 | 용도 |
|---|---|---|
| `db:generate` | `prisma generate` | Client 타입 재생성 |
| `db:migrate` | `prisma migrate dev` | 개발 마이그레이션 생성+적용 |
| `db:deploy` | `prisma migrate deploy` | 프로덕션 마이그레이션 적용 |
| `db:studio` | `prisma studio` | DB GUI |
| `db:reset` | `prisma migrate reset` | DB 초기화 |
| `postinstall` | `prisma generate` | install 후 자동 Client 생성 |

### 4. Prisma 7.x PrismaPg 어댑터 적용
Prisma 7.x부터 `PrismaClient`에 직접 `datasources.db.url`을 넘기는 방식 대신, `@prisma/adapter-pg` 패키지의 `PrismaPg` 어댑터를 통해 DB에 연결한다.

**`packages/db/src/lib/db.ts` — 싱글턴 PrismaClient:**
```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL']!,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
```

**`libs/server/prisma/src/lib/server-prisma.service.ts` — NestJS 서비스:**
```typescript
@Injectable()
export class ServerPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env['DATABASE_URL']!,
    });
    super({ adapter });
  }
}
```

**의존성 추가:**
- `packages/db/package.json`: `"@prisma/adapter-pg": "^7.4.1"` 추가
- `libs/server/prisma/package.json`: `"@prisma/adapter-pg": "^7.4.1"`, `"@prisma/client": "^7.4.0"` 추가

### 5. cookie-parser ESM import 및 webpack externals 수정
NestJS 서버에서 `cookie-parser`를 사용할 때 두 가지 문제가 있었다:

1. **ESM default import**: `import cookieParser from 'cookie-parser'` 형태로 사용하여 ESM 환경에서 올바르게 동작하도록 수정
2. **webpack externals**: `cookie-parser`가 webpack 번들에 포함되면 런타임 에러가 발생하므로 externals에 추가

```javascript
// apps/server/webpack.config.js
externals: {
  bcryptjs: 'commonjs bcryptjs',
  nodemailer: 'commonjs nodemailer',
  'cookie-parser': 'commonjs cookie-parser',  // 추가
},
```

### 6. 첫 마이그레이션 (init)
`prisma migrate dev --name init`으로 생성된 SQL:
- 2개 enum: `IdentityProvider`, `MembershipRole`
- 7개 테이블: `users`, `accounts`, `refresh_tokens`, `organizations`, `memberships`, `invites`, `audit_logs`
- 인덱스, unique 제약, 외래 키(CASCADE/SET NULL) 모두 포함
- `_prisma_migrations` 이력 테이블 자동 생성

## How to use it

### 개발 환경 최초 셋업
```bash
# 1. 의존성 설치 (postinstall로 prisma generate 자동 실행)
pnpm install

# 2. .env 파일 확인 (이미 생성됨, 필요 시 .env.example 참고)
cat .env

# 3. Docker PostgreSQL 기동
pnpm docker:up

# 4. 마이그레이션 적용 (이미 init이 있으므로 새 스키마 변경이 없으면 skip)
cd packages/db && npx prisma migrate dev
```

### 일상적인 개발 워크플로우
```bash
# Docker 기동/중지
pnpm docker:up
pnpm docker:down

# 스키마 변경 후 마이그레이션
cd packages/db && npx prisma migrate dev --name <migration_name>

# DB GUI로 데이터 확인
pnpm db:studio

# DB 초기화 (모든 데이터 삭제 후 마이그레이션 재적용)
pnpm db:reset

# 프로덕션 마이그레이션 적용
pnpm db:deploy
```

### DB 접속 정보
```
Host: localhost
Port: 5432
User: inquiry
Password: inquiry_password
Database: inquiry
```

## Related Components/Modules
- `packages/db/prisma/schema.prisma` — Prisma 스키마 정의 (모델/enum)
- `packages/db/src/lib/db.ts` — PrismaPg 어댑터를 사용한 PrismaClient 싱글턴 인스턴스
- `packages/db/src/index.ts` — db 패키지 진입점 (prisma, PrismaClient 재export)
- `libs/server/prisma/src/lib/server-prisma.service.ts` — NestJS용 PrismaClient 서비스 (PrismaPg 어댑터 사용)
- `apps/server/src/main.ts` — NestJS 서버 부트스트랩 (cookie-parser 적용)
- `apps/server/webpack.config.js` — 서버 빌드 설정 (externals 관리)
- `pnpm-lock.yaml` — dotenv, @prisma/adapter-pg 등 의존성 추가로 변경됨

## Precautions
- **포트 충돌**: 로컬에 PostgreSQL이 이미 5432 포트를 사용 중이면 `docker-compose.yml`의 포트를 변경해야 함
- **pnpm 프록시 --name 전달**: `pnpm db:migrate -- --name <name>`은 pnpm 체인을 통과하면서 `--name`이 유실될 수 있음. `cd packages/db && npx prisma migrate dev --name <name>`을 직접 사용 권장
- **Prisma Client 생성 위치**: generator에 output이 미지정이므로 `node_modules/.prisma/client`에 생성됨. `packages/db/.gitignore`의 `/src/generated/prisma`는 향후 output을 명시할 경우 대비
- **ESM 환경**: `packages/db`는 `"type": "module"`이므로 `import.meta.url` 기반 경로 사용 필수
- **PrismaPg 어댑터**: Prisma 7.x에서는 `@prisma/adapter-pg`가 필수. `PrismaClient` 생성 시 반드시 `adapter` 옵션으로 전달해야 함
- **webpack externals**: Node.js 네이티브 모듈이나 CommonJS 전용 패키지(`bcryptjs`, `nodemailer`, `cookie-parser` 등)는 webpack externals에 등록하여 번들링에서 제외해야 런타임 에러 방지 가능
