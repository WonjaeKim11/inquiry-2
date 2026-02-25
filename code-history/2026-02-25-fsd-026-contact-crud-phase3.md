# FSD-026 Phase 3: Contact CRUD 코어 + Guards 구현

## Overview
연락처 관리 기능의 핵심 CRUD 서비스와 접근 제어 가드를 구현한다.
Phase 2에서 구현된 속성 키/값 시스템 위에 연락처 목록 조회(페이지네이션, 검색), 단건 조회, 삭제, SDK identify 기능을 제공하는 ContactService를 구현하고, 환경 기반 역할 검증(ContactAccessGuard)과 Enterprise 라이선스 검증(EnterpriseLicenseGuard)을 적용하여 보안 접근 제어를 완성했다.

## Changed Files

| 파일 | 역할 |
|------|------|
| `libs/server/contact/src/lib/services/contact.service.ts` | (신규) 연락처 CRUD 핵심 비즈니스 로직 서비스 |
| `libs/server/contact/src/lib/guards/contact-access.guard.ts` | (신규) 환경→프로젝트→조직 추적 기반 역할 검증 가드 + ContactMinRole 데코레이터 |
| `libs/server/contact/src/lib/guards/enterprise-license.guard.ts` | (신규) Enterprise 라이선스 + CONTACTS_ENABLED 환경변수 fallback 가드 |
| `libs/server/contact/src/lib/controllers/contact.controller.ts` | (신규) 연락처 GET/DELETE REST API 컨트롤러 |
| `libs/server/contact/src/lib/dto/search-contact.dto.ts` | (신규) 목록 조회 요청 zod 스키마 (page, pageSize, search) |
| `libs/server/contact/src/lib/contact.module.ts` | (수정) ContactService, ContactController, Guards 등록 |
| `libs/server/contact/src/index.ts` | (수정) 신규 파일들 re-export 추가 |

## Major Changes

### 1. ContactService

연락처의 핵심 CRUD 로직을 담당한다.

- **findAll**: 페이지네이션과 검색을 지원하는 목록 조회. 검색은 연락처 ID와 속성 값(value)에 대해 case-insensitive로 수행한다. 최초 접근 시 기본 속성 키를 자동 시딩한다.
- **findById**: 단건 조회. 속성 값을 평탄화된 객체로 반환한다.
- **delete**: hard delete. Cascade로 속성 값이 자동 삭제되며, AuditLogService를 통해 감사 로그를 fire-and-forget으로 기록한다.
- **identifyByUserId**: SDK에서 호출하는 연락처 식별 메서드. userId 속성으로 기존 연락처를 검색하고 없으면 새로 생성한다. 추가 속성은 자동으로 키를 생성(CUSTOM)하여 upsert한다.
- **flattenAttributes**: Prisma에서 조회된 속성 값 배열을 `{ key: value }` 형태의 평탄 객체로 변환한다. dataType에 따라 numberValue, dateValue, value 중 적절한 값을 반환한다.

### 2. ContactAccessGuard

환경(envId) 기반 접근 제어 가드. OrgRoleGuard 패턴을 따르되, envId에서 프로젝트→조직을 추적하는 점이 다르다.

```typescript
// 역할 계층: OWNER(40) > ADMIN(30) > BILLING(20) > MEMBER(10)
@ContactMinRole('ADMIN')  // OWNER 또는 ADMIN만 접근 가능
@ContactMinRole('MEMBER') // 모든 멤버 접근 가능
```

SetMetadata 기반 `ContactMinRole` 데코레이터를 함께 제공한다.

### 3. EnterpriseLicenseGuard

Enterprise 라이선스가 필요한 기능에 대한 가드. `CONTACTS_ENABLED=true` 환경변수로 라이선스 없이도 활성화할 수 있는 fallback을 제공한다.

### 4. ContactController

JWT + LicenseGuard + ContactAccessGuard 3중 가드를 적용한 REST API 컨트롤러.

- `GET /environments/:envId/contacts` - 목록 조회 (MEMBER 이상)
- `GET /environments/:envId/contacts/:id` - 단건 조회 (MEMBER 이상)
- `DELETE /environments/:envId/contacts/:id` - 삭제 (ADMIN 이상, 204 No Content)

### 5. SearchContactDto

zod 기반 쿼리 파라미터 검증 스키마. `z.coerce.number()`를 사용하여 쿼리 문자열을 자동 변환한다.

## How to use it

### 연락처 목록 조회

```http
GET /environments/{envId}/contacts?page=1&pageSize=25&search=john
Authorization: Bearer {jwt_token}
```

응답:
```json
{
  "data": [
    {
      "id": "clxyz123",
      "createdAt": "2026-02-25T00:00:00.000Z",
      "updatedAt": "2026-02-25T00:00:00.000Z",
      "environmentId": "env_123",
      "attributes": {
        "userId": "user_001",
        "email": "john@example.com",
        "firstName": "John"
      }
    }
  ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 25
}
```

### 연락처 단건 조회

```http
GET /environments/{envId}/contacts/{contactId}
Authorization: Bearer {jwt_token}
```

### 연락처 삭제

```http
DELETE /environments/{envId}/contacts/{contactId}
Authorization: Bearer {jwt_token}
```

응답: `204 No Content`

### SDK identify (서비스 레벨 호출)

```typescript
const result = await contactService.identifyByUserId(
  'env_123',
  'user_001',
  { email: 'john@example.com', firstName: 'John', plan: 'pro' }
);
// result: { contactId: 'clxyz123', isNew: true }
```

## Related Components/Modules

- **ContactAttributeService** (Phase 2): 속성 키 CRUD + 값 upsert, seedDefaultKeys, getKeyMap 메서드를 ContactService가 직접 사용
- **TypeDetectorService** (Phase 2): SDK identify 시 속성 값의 데이터 타입 자동 탐지에 사용
- **AuditLogService** (`@inquiry/server-audit-log`): 연락처 삭제 시 감사 로그 기록
- **LicenseGuard/RequireLicense** (`@inquiry/server-license`): contacts feature 라이선스 검증
- **OrgRoleGuard** (`@inquiry/server-organization`): ContactAccessGuard의 역할 계층 패턴 참고

## Precautions

- ContactAccessGuard는 매 요청마다 환경→프로젝트→조직→멤버십 쿼리 2회를 실행한다. 고트래픽 시 캐싱 레이어 도입을 고려할 것.
- `identifyByUserId`는 속성 키가 없으면 자동 생성하므로, safe identifier 규칙에 맞지 않는 키는 자동으로 건너뛴다 (경고 로그만 출력).
- 연락처 삭제는 hard delete이며, Cascade로 모든 속성 값이 함께 삭제된다. 복구 불가.
- `CONTACTS_ENABLED=true` 환경변수는 개발/테스트 환경에서 라이선스 없이 기능을 활성화하기 위한 fallback이다.
