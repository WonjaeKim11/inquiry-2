# FSD-026 Phase 7: PersonalizedLink 구현

## Overview
Contact별 고유 설문 링크를 생성하고 검증하는 기능을 구현한다. 각 연락처에 대해 HMAC-SHA256 기반의 고유 토큰을 발급하여 개인화된 설문 URL을 제공하며, 만료일 설정 및 토큰 유효성 검증 기능을 포함한다. 이를 통해 특정 연락처에게만 접근 가능한 설문 링크를 배포할 수 있다.

## Changed Files

### 신규 생성
- `libs/server/contact/src/lib/services/personalized-link.service.ts` - 개인화 링크 생성/검증 비즈니스 로직 서비스
- `libs/server/contact/src/lib/dto/create-personalized-link.dto.ts` - 개인화 링크 생성 요청 Zod 검증 스키마 및 타입

### 수정
- `libs/server/contact/src/lib/controllers/contact.controller.ts` - PersonalizedLinkService DI 추가 및 POST 엔드포인트 등록
- `libs/server/contact/src/lib/contact.module.ts` - PersonalizedLinkService를 providers/exports에 등록
- `libs/server/contact/src/index.ts` - 서비스 및 DTO barrel export 추가
- `.env.example` - PERSONALIZED_LINK_SECRET 환경변수 안내 추가

## Major Changes

### 1. PersonalizedLinkService

핵심 서비스로 두 가지 주요 기능을 제공한다:

**createLinks** - 개인화 링크 일괄 생성:
- 설문 존재 여부 확인 후 연락처가 같은 환경에 속하는지 검증
- 동일 contactId + surveyId 조합에 기존 링크가 있으면 만료일만 갱신 (findFirst + update)
- 없으면 새 HMAC-SHA256 토큰을 생성하여 create
- 최대 1,000건까지 일괄 처리 가능

**validateToken** - 토큰 유효성 검증:
- token으로 personalizedLink 조회 (contact, survey 포함)
- 만료일 초과 시 BadRequestException 반환

**토큰 생성 알고리즘:**
```typescript
// payload = contactId:surveyId:timestamp(base36):random(hex)
// token = base64url(payload) + '.' + hmac.slice(0, 16)
const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
const encodedPayload = Buffer.from(payload).toString('base64url');
return `${encodedPayload}.${hmac.slice(0, 16)}`;
```

### 2. CreatePersonalizedLinkDto

Zod 스키마로 요청 본문을 검증한다:
- `surveyId` - 필수 문자열
- `contactIds` - 1~1,000개의 문자열 배열
- `expirationDays` - 1~365일 정수 (선택, null 가능)

### 3. ContactController 엔드포인트

`POST /environments/:envId/contacts/personalized-links` 엔드포인트를 추가했다. ADMIN 이상 권한이 필요하며, ZodValidationPipe로 요청 검증 후 PersonalizedLinkService에 위임한다. `:id` 파라미터 라우트보다 앞에 위치시켜 라우트 충돌을 방지한다.

## How to use it

### 개인화 링크 생성

```bash
curl -X POST http://localhost:3000/api/environments/{envId}/contacts/personalized-links \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "surveyId": "clxxxxxxxxxx",
    "contactIds": ["clcontact001", "clcontact002"],
    "expirationDays": 30
  }'
```

**응답 (201 Created):**
```json
{
  "data": [
    {
      "id": "cllink001",
      "contactId": "clcontact001",
      "surveyId": "clxxxxxxxxxx",
      "token": "Y2xjb250YWN0MDAx...",
      "expiresAt": "2026-03-27T00:00:00.000Z",
      "createdAt": "2026-02-25T00:00:00.000Z"
    }
  ]
}
```

### 토큰 검증 (서비스 내부 호출)

```typescript
const link = await personalizedLinkService.validateToken('Y2xjb250YWN0MDAx...');
// link.contact, link.survey 정보 포함
```

## Related Components/Modules

- **Prisma PersonalizedLink 모델** (`packages/db/prisma/schema.prisma`) - token @unique, contactId/surveyId 인덱스
- **ContactModule** - 서비스 등록 및 DI 관리
- **ContactAccessGuard / ContactMinRole** - ADMIN 권한 검증
- **LicenseGuard / RequireLicense('contacts')** - contacts 라이선스 검증
- **ResourceNotFoundException** (`@inquiry/server-core`) - 리소스 미발견 예외 처리
- **ZodValidationPipe** (`@inquiry/server-core`) - 요청 본문 검증

## Precautions

- `PERSONALIZED_LINK_SECRET` 환경변수를 프로덕션에서 반드시 고유한 값으로 설정해야 한다 (기본값 `default-secret-change-me` 사용 금지)
- 토큰에 랜덤 컴포넌트가 포함되어 동일 contactId+surveyId에 대해 매번 다른 토큰이 생성되므로, 기존 링크 조회는 findFirst로 처리한다
- contactIds 배열이 최대 1,000건이므로 대량 처리 시 순차 루프로 동작한다. 향후 필요 시 배치 처리 최적화 고려
- validateToken은 현재 컨트롤러에서 직접 노출하지 않으며, 향후 공개 설문 접근 시 사용될 예정
