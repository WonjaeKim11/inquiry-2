# 싱글유즈 및 개인 링크 — 요구사항 명세서

> **문서번호**: FSD-017 | **FR 범위**: FR-025 ~ FR-026
> **라이선스**: Community (Single-use) / Enterprise (Personal Links)

---

## 1. 목적/배경

설문 조사에서 응답의 고유성과 추적 가능성은 데이터 품질의 핵심이다. Single-use 링크는 각 링크가 한 번만 사용 가능하도록 보장하여 중복 응답을 방지한다. Personal Link는 Enterprise 기능으로, Contact(연락처)에 연결된 개인화 링크를 JWT 토큰 기반으로 생성하여 응답자를 식별하고 추적할 수 있게 한다. 두 기능 모두 암호화 키 기반 대칭 암호화를 활용하며, Personal Link는 추가로 JWT HS256 서명을 사용한다.

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- Single-use ID 생성 (CUID2 기반)
- Single-use ID 암호화/복호화 (AES-256-GCM)
- Single-use 링크의 응답 완료 상태 검사
- Personal Link JWT 토큰 생성 및 검증
- Personal Link 만료(expiration) 지원
- Contact ID 기반 기존 응답 중복 방지
- Anonymous Links 탭의 Single-use / Multi-use 토글 UI
- 대량 Single-use 링크 생성 및 CSV 다운로드

### Out-of-scope
- Contact 관리 (CRUD) 기능
- Segment 기반 대량 링크 생성 API
- 응답 데이터 저장 로직

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Survey Creator | Single-use 또는 Personal Link를 설정하고 배포하는 사용자 |
| Survey Respondent | 고유 링크를 통해 설문에 접근하여 1회 응답하는 최종 사용자 |
| Organization Admin | Enterprise 라이선스 관리 및 Contact 데이터 관리 |
| API Consumer | Management API를 통해 Personal Link를 대량 생성하는 외부 시스템 |

## 4. 기능 요구사항

### FR-025: Single-use 링크

#### FR-025-01: Single-use 설정 구조

Single-use 설정은 다음 속성으로 구성된다:

| 속성 | 설명 |
|------|------|
| enabled | 활성화 여부 (boolean) |
| heading | 완료 메시지 제목 (선택) |
| subheading | 완료 메시지 부제 (선택) |
| isEncrypted | URL 암호화 여부 (boolean) |

이 설정은 null일 수 있으며, null인 경우 Single-use가 비활성화된 것으로 간주한다.

#### FR-025-02: Single-use ID 생성

**생성 로직:**
1. CUID2 라이브러리를 사용하여 고유 ID 생성
2. 암호화 옵션이 활성화되면 암호화 키로 AES-256-GCM 암호화 수행
3. 암호화 결과 형식: {초기화벡터}:{암호문}:{인증태그} (hex 인코딩)
4. 암호화 비활성화 시 평문 CUID2 반환
5. 암호화 활성화 시 암호화 키가 미설정이면 에러 발생

#### FR-025-03: Single-use ID 검증

검증 과정:
1. 암호화 키가 미설정이면 에러 발생
2. 전달된 ID를 AES-256-GCM으로 복호화 시도
3. 복호화 실패 시 → 유효하지 않음 (undefined 반환)
4. 복호화 성공 후 CUID2 형식 검사
5. CUID2 형식이면 → 유효 (원본 ID 반환)
6. CUID2 형식이 아니면 → 유효하지 않음 (undefined 반환)

#### FR-025-04: 링크 설문 페이지에서의 Single-use 처리

**페이지 렌더링 흐름:**
1. 설문의 Single-use 활성 여부 확인
2. Single-use ID 검증 수행 (암호화 여부에 따라 복호화 또는 그대로 사용)
3. ID가 없거나 검증 실패 시 → "link invalid" 상태 표시
4. 검증 성공 후 기존 응답 조회 (설문 ID + Single-use ID 기준)
5. 기존 응답이 완료 상태이면 → 완료 메시지 표시 (커스텀 heading/subheading)
6. 기존 응답이 미완료이면 → 기존 응답 ID 전달하여 이어서 응답

#### FR-025-05: Multi-use / Single-use 토글 UI

Anonymous Links 탭에서 Multi-use와 Single-use를 상호 배타적으로 토글한다.

**모달 타입:**
- Multi-use 비활성화 경고: Multi-use 링크를 비활성화하면 기존 링크가 무효화됨을 안내
- Single-use 비활성화 경고: Single-use 링크를 비활성화하면 기존 링크가 무효화됨을 안내

토글 전환 시 확인 모달을 표시하여 사용자의 의도를 확인한다.

#### FR-025-06: 대량 링크 생성 및 CSV 다운로드

대량 링크 생성 기능:
1. 사용자가 생성 수량을 입력하면 서버에서 Single-use ID를 일괄 생성
2. 생성된 ID를 설문 URL에 suId 파라미터로 추가하여 개별 링크 생성
3. 모든 링크를 줄바꿈으로 구분한 CSV 파일로 다운로드

- **최소 생성 수**: 1
- **최대 생성 수**: 5,000
- **파일명**: single-use-links-{surveyId}.csv
- **커스텀 suId**: 암호화 비활성 시 ?suId=CUSTOM-ID 형태로 사용자 정의 가능

### FR-026: Personal Link (Enterprise)

#### FR-026-01: Personal Link 생성

Personal Link는 Contact ID와 Survey ID를 이중 암호화하여 JWT 토큰 URL을 생성한다.

**암호화 계층 구조:**
1. **1계층**: Contact ID와 Survey ID를 각각 AES-256-GCM으로 대칭 암호화
2. **2계층**: 암호화된 값들을 JWT HS256으로 서명 (암호화 키 사용)

**생성 과정:**
1. 암호화 키 존재 여부 확인
2. 설문 존재 여부 확인
3. Contact ID와 Survey ID를 각각 AES-256-GCM으로 암호화
4. Single-use가 활성화된 설문이면 suId도 추가 생성
5. 암호화된 ID들을 JWT 페이로드에 포함
6. 만료일이 설정된 경우 JWT 만료 시간 설정 (일 단위)
7. 암호화 키로 HS256 서명하여 토큰 생성

**URL 패턴:** {publicDomain}/c/{jwt_token}[?suId={singleUseId}]

#### FR-026-02: Personal Link 토큰 검증

검증 과정:
1. 암호화 키 존재 확인
2. JWT 서명 및 만료 시간 검증
3. 페이로드에서 Contact ID와 Survey ID 추출
4. 각 ID를 대칭 복호화로 원본 복원

**에러 분류:**

| 에러 유형 | 원인 | 사용자 표시 |
|----------|------|-----------|
| 토큰 만료 | JWT 만료 시간 경과 | "link expired" 상태 표시 |
| 유효하지 않은 토큰 | JWT 서명 불일치 / 변조 | "link invalid" 상태 표시 |
| 서버 내부 에러 | 암호화 키 미설정 | 서버 에러 |

#### FR-026-03: Contact Survey 페이지 렌더링

Contact Survey 페이지는 다음 순서로 처리한다:

1. JWT 토큰 검증
   - 토큰 만료 시 → "link expired" 상태 표시
   - 토큰 유효하지 않을 시 → "link invalid" 상태 표시
2. 기존 응답 중복 검사 (Contact 기반)
   - 이미 응답한 Contact이면 → "response submitted" 상태 표시
3. 설문 렌더링 (Contact ID 전달)

**핵심 차이점 (Anonymous vs Personal):**
- Anonymous: Survey ID 기반 접근, 응답자 미식별
- Personal: Contact ID 전달 → 서버에서 Contact에 응답 연결
- Personal: 기존 응답이 있으면 "response submitted" 상태 반환 (1인 1응답 강제)

## 5. 비기능 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-025-01 | 암호화 강도 | AES-256-GCM (NIST 표준) |
| NFR-025-02 | JWT 알고리즘 | HS256 (HMAC-SHA256) |
| NFR-025-03 | 대량 링크 생성 | 최대 5,000개 동시 생성 지원 |
| NFR-025-04 | 토큰 위변조 방지 | JWT 서명 + AES-GCM 인증 태그 이중 검증 |
| NFR-025-05 | CUID2 충돌률 | 이론적으로 10^-24 이하 |
| NFR-026-01 | Enterprise 라이선스 | Personal Links는 Enterprise 플랜 필수 |
| NFR-026-02 | 토큰 만료 정밀도 | 일 단위 |

## 6. 정책/제약

| 항목 | 값 |
|------|------|
| Single-use URL 파라미터 | ?suId={encryptedId} |
| Personal Link URL 패턴 | /c/{jwt_token} |
| 암호화 알고리즘 | AES-256-GCM (V2) |
| 레거시 암호화 | AES-256-CBC (V1, 읽기 전용 호환) |
| 암호문 형식 | {초기화벡터_hex}:{암호문_hex}:{인증태그_hex} |
| JWT 알고리즘 | HS256 |
| JWT 만료 형식 | 일 단위 |
| 최대 대량 생성 수 | 5,000 |
| 최소 대량 생성 수 | 1 |
| CSV 파일명 | single-use-links-{surveyId}.csv |
| 비활성 상태 목록 | "paused", "completed", "link invalid", "response submitted", "link expired" |
| Single-use 완료 시 | 커스텀 heading/subheading 포함 완료 메시지 표시 |
| 토큰 만료 에러 상세 | 필드: token, 이슈: token_expired |

## 7. 수용 기준 (Acceptance Criteria)

| AC-ID | 시나리오 | 기대 결과 |
|-------|----------|----------|
| AC-025-01 | 암호화 활성 Single-use 링크 접근 | suId가 정상 복호화되어 설문 표시 |
| AC-025-02 | 변조된 suId로 접근 | "link invalid" 상태 표시 |
| AC-025-03 | 이미 완료된 Single-use 링크 재접근 | 완료 메시지 표시 (커스텀 heading/subheading) |
| AC-025-04 | suId 없이 Single-use 설문 접근 | "link invalid" 상태 표시 |
| AC-025-05 | 비암호화 Single-use 링크 | CUID2 값이 그대로 URL에 표시됨 |
| AC-025-06 | 1,000개 링크 대량 생성 | CSV 파일이 다운로드되며 각 링크에 고유 suId 포함 |
| AC-025-07 | Multi-use ↔ Single-use 토글 | 확인 모달 표시 후 설정 변경 |
| AC-025-08 | 커스텀 suId (비암호화 모드) | ?suId=CUSTOM-ID 형태로 URL 제공 |
| AC-026-01 | Personal Link 생성 (만료 없음) | 유효한 JWT 토큰 URL 반환, 무기한 유효 |
| AC-026-02 | Personal Link 생성 (30일 만료) | JWT에 30일 만료 설정, 만료 후 "link expired" 표시 |
| AC-026-03 | Personal Link로 이미 응답한 Contact | "response submitted" 상태 표시 |
| AC-026-04 | 변조된 JWT 토큰으로 접근 | "link invalid" 상태 표시 |
| AC-026-05 | 암호화 키 미설정 시 | 서버 에러 반환 (링크 생성/검증 모두) |
| AC-026-06 | Single-use + Personal Link 조합 | Personal Link URL에 suId 파라미터 추가됨 |
| AC-026-07 | Personal Link의 OG 메타데이터 | 커스텀 favicon, OG 이미지 포함 |
