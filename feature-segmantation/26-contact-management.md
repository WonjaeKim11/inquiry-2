# 연락처(Contact) 관리 — 요구사항 명세서

> **문서번호**: FSD-026 | **FR 범위**: FR-045
> **라이선스**: Enterprise (license feature flag: contacts)

---

## 1. 목적/배경

Formbricks에서 "연락처(Contact)"는 설문 대상이 되는 사용자/고객을 의미한다. 연락처 관리 기능은 CSV 대량 업로드, SDK를 통한 자동 생성, API를 통한 CRUD, 그리고 속성(Attribute) 기반의 타이핑 시스템을 제공하여 설문 타겟팅과 개인화된 설문 링크 생성을 가능하게 한다.

이 기능은 Enterprise 라이선스가 필요하며, 라이선스 feature flag인 contacts가 활성화되어 있는지 확인하는 처리를 거친다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- CSV 파일을 통한 연락처 대량 가져오기 (최대 10,000건)
- API v2를 통한 단건/대량(250건) 연락처 생성
- SDK 사용자 식별 호출을 통한 자동 연락처 생성
- 연락처 속성(attribute) CRUD 및 typed storage (string, number, date)
- 중복 처리 전략 3종 (skip, update, overwrite)
- 연락처 삭제 (hard delete)
- 속성 키(attribute key) 관리 (default vs custom)
- 개인화된 설문 링크 생성

### Out-of-scope
- 관리자 UI에서의 개별 연락처 수동 생성 (CSV 또는 API만 지원)
- 연락처 병합(merge)
- 연락처 소프트 삭제 (hard delete만 지원)

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Organization Owner/Manager | 연락처를 관리하고 설문 타겟팅에 활용 |
| Team Member | 할당된 프로젝트의 연락처 조회 |
| SDK/API Consumer | 프로그래밍 방식으로 연락처 생성/업데이트 |
| System | SDK identify 시 자동 연락처 생성 |

---

## 4. 기능 요구사항

### FR-045-01: Contact 데이터 모델

연락처(Contact) 데이터 모델은 다음과 같은 속성을 가진다:

| 필드 | 설명 |
|------|------|
| ID | 고유 식별자 (자동 생성) |
| 생성일 | 연락처 생성 시각 |
| 수정일 | 마지막 수정 시각 |
| 환경 ID | 소속 환경 식별자 |
| 응답 목록 | 해당 연락처의 설문 응답 |
| 속성 목록 | 연락처에 연결된 속성 값 |
| 표시 목록 | 설문 표시 기록 |

환경 ID 기준으로 인덱스가 설정된다.

### FR-045-02: Contact Attribute 시스템

#### Attribute Key 모델

속성 키(Attribute Key) 모델은 다음 필드를 가진다:

| 필드 | 설명 |
|------|------|
| ID | 고유 식별자 |
| 고유성 여부 | 해당 속성 값이 유니크한지 여부 (기본: false) |
| 키 이름 | 속성의 고유 키 이름 |
| 표시 이름 | 사용자에게 보이는 이름 (선택) |
| 설명 | 속성 설명 (선택) |
| 속성 종류 | default 또는 custom |
| 데이터 타입 | string, number, date 중 하나 (기본: string) |
| 환경 ID | 소속 환경 식별자 |

키 이름과 환경 ID 조합으로 유니크 제약이 설정된다.

- **종류: default** - 시스템이 정의한 기본 속성 (수정/삭제 불가). 예: userId, email, firstName, lastName
- **종류: custom** - 사용자가 정의한 커스텀 속성 (수정/삭제 가능)

보호 정책:
- default 타입 속성 키는 수정 불가 — 수정 시도 시 "허용되지 않는 작업" 에러 반환
- default 타입 속성 키는 삭제 불가 — 삭제 시도 시 "허용되지 않는 작업" 에러 반환

#### Attribute Value 모델 (Typed Storage)

속성 값(Attribute Value) 모델은 다음 필드를 가진다:

| 필드 | 설명 |
|------|------|
| ID | 고유 식별자 |
| 속성 키 ID | 연결된 속성 키 식별자 |
| 연락처 ID | 연결된 연락처 식별자 |
| 문자열 값 | 문자열 형태의 값 (하위 호환성) |
| 숫자 값 | number 타입 전용 네이티브 저장 (선택) |
| 날짜 값 | date 타입 전용 네이티브 저장 (선택) |

연락처 ID와 속성 키 ID 조합으로 유니크 제약이 설정되며, 속성 키 ID + 각 값 컬럼별로 인덱스가 설정된다.

#### 데이터 타입

속성 데이터 타입은 string, number, date의 3종을 지원한다.

### FR-045-03: CSV Import

#### 제약 조건
- 최대 레코드 수: **10,000건**
- email 필드 필수 (모든 레코드에 email 있어야 함)
- email 중복 불가 (CSV 내 동일 email 불가)
- userId 중복 불가 (CSV 내 동일 userId 불가)
- 속성 키 이름은 safe identifier 규칙 준수 (소문자, 숫자, 언더스코어, 문자로 시작)

#### 중복 처리 전략

3가지 중복 처리 전략을 지원한다:

| 전략 | 동작 |
|------|------|
| skip | 기존 연락처와 email이 일치하면 해당 레코드 무시 |
| update | 기존 연락처의 속성을 CSV 값으로 upsert (기존 값 유지 + 새 값 추가/갱신) |
| overwrite | 기존 연락처의 모든 속성을 삭제 후 CSV 값으로 재생성 |

#### CSV Import 처리 흐름

1. CSV 데이터에서 메타데이터 추출 (email, userId, 속성 키)
2. DB에서 기존 데이터 조회 (기존 연락처, userId, 속성 키) - 병렬 처리
3. Lookup Map 구성 (email-to-contact, attributeKey)
4. 속성 타입 자동 탐지 및 검증:
   - 기존 typed 속성: 타입 불일치 시 validation error 반환
   - 새 속성: 값이 혼재되면 string으로 downgrade
5. 누락된 속성 키 자동 생성
6. 각 CSV 레코드 처리

#### 타입 자동 탐지

속성 값의 데이터 타입은 다음 우선순위로 자동 탐지된다:
- 우선순위: Date > Number > String
- Date: Date 객체, ISO 8601 형식, DD-MM-YYYY, MM-DD-YYYY
- Number: 숫자 또는 숫자 문자열
- String: 그 외 모든 값

#### userId 충돌 해결

CSV 레코드의 userId가 다른 기존 연락처에 이미 할당된 경우, userId를 제거하고 기존 연락처의 userId를 유지한다.

### FR-045-04: API v2 Bulk Upload

- 최대 **250건** 동시 업로드
- 각 연락처에 email 필수 (유효한 이메일 형식)
- 연락처 간 email/userId 중복 불가
- 동일 연락처 내 속성 키 중복 불가

### FR-045-05: Contact 조회/검색

- 페이지네이션: 페이지당 일정 건수 단위
- 검색: 속성 값 또는 연락처 ID로 검색 (case-insensitive)
- 정렬: 생성일 내림차순

### FR-045-06: Contact 삭제

- **Hard delete** - 데이터베이스에서 완전 삭제
- Cascade로 관련 속성도 함께 삭제

### FR-045-07: 개인화된 설문 링크 생성

- 세그먼트에 속한 연락처에 대해 개인화된 설문 URL 생성
- 만료일(expirationDays) 선택적 설정

### FR-045-08: SDK 자동 연락처 생성

SDK에서 사용자 식별 호출 시 해당 userId의 연락처가 없으면 자동 생성한다.

#### SDK 타입 탐지

SDK에서 전달되는 값의 타입 탐지는 CSV보다 엄격하다:
- JS number 타입 -> number
- ISO 8601 문자열 -> date
- 그 외 모든 문자열 -> string (숫자처럼 보이는 문자열도 string으로 처리)

---

## 5. 비기능 요구사항

| ID | 항목 | 내용 |
|----|------|------|
| NFR-C01 | 성능 | CSV 10,000건 import 시 합리적인 시간 내 완료 (병렬 처리) |
| NFR-C02 | 데이터 무결성 | 연락처 ID와 속성 키 ID 조합의 유니크 제약으로 속성 중복 방지 |
| NFR-C03 | 보안 | Enterprise 라이선스 필수, Environment 단위 데이터 격리 |
| NFR-C04 | 확장성 | 환경당 최대 150개 속성 키 |
| NFR-C05 | 캐싱 | 요청 단위 중복 제거 캐싱 적용 |

---

## 6. 정책/제약

| 항목 | 값 |
|------|-----|
| CSV 최대 레코드 수 | 10,000건 |
| API Bulk 최대 건수 | 250건 |
| 환경당 최대 속성 키 수 | 150개 |
| 속성 키 유니크 범위 | 키 이름 + 환경 ID |
| 속성 값 유니크 범위 | 연락처 ID + 속성 키 ID |
| 라이선스 feature flag | contacts (boolean) |
| 속성 데이터 타입 | string, number, date |
| 속성 종류 | default, custom |
| 중복 처리 전략 | skip, update, overwrite |
| 삭제 방식 | Hard delete (Cascade) |
| 페이지네이션 | 페이지당 일정 건수 단위 |

---

## 7. 수용 기준 (Acceptance Criteria)

| AC-ID | 기준 |
|-------|------|
| AC-026-01 | Enterprise 라이선스 없이 연락처 관리 페이지 접근 시 적절한 안내가 표시된다 |
| AC-026-02 | CSV에 email 필드가 없는 레코드가 포함되면 검증 에러가 반환된다 |
| AC-026-03 | CSV에 중복 email이 포함되면 검증 에러가 반환된다 |
| AC-026-04 | 중복 처리 전략 "skip" 선택 시 기존 연락처와 일치하는 레코드는 무시된다 |
| AC-026-05 | 중복 처리 전략 "update" 선택 시 기존 속성 유지 + 새 속성 추가/갱신된다 |
| AC-026-06 | 중복 처리 전략 "overwrite" 선택 시 기존 속성 모두 삭제 후 CSV 값으로 대체된다 |
| AC-026-07 | 10,000건 초과 CSV 업로드 시 검증 에러가 반환된다 |
| AC-026-08 | default 타입 속성 키의 수정/삭제 시도 시 허용되지 않는 작업 에러가 발생한다 |
| AC-026-09 | 새 속성 키 생성 시 safe identifier 규칙을 위반하면 검증 에러가 발생한다 |
| AC-026-10 | typed attribute(number, date)에 잘못된 형식의 값이 들어오면 적절한 에러가 반환된다 |
| AC-026-11 | 연락처 삭제 시 관련 속성, 응답 참조 등이 cascade로 정리된다 |
| AC-026-12 | SDK identify 호출 시 해당 userId의 연락처가 자동 생성된다 |
| AC-026-13 | API v2 bulk upload에서 250건 초과 시 검증 에러가 반환된다 |
| AC-026-14 | 연락처 검색 시 속성 값과 ID 모두에서 case-insensitive 매칭이 동작한다 |
