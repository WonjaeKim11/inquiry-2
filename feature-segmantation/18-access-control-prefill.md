# 접근 제어 및 데이터 프리필 — 요구사항 명세서

> **문서번호**: FSD-018 | **FR 범위**: FR-027 ~ FR-028
> **라이선스**: Community

---

## 1. 목적/배경

Link Survey는 URL만으로 누구나 접근 가능하기 때문에, 설문 생성자가 접근을 제한하거나 응답의 신뢰성을 확보할 수 있는 메커니즘이 필요하다. Formbricks는 4자리 PIN 보호, 이메일 인증, 단일 이메일 응답 제한 등의 접근 제어 기능을 제공한다. 또한 URL 파라미터를 통한 데이터 프리필, 특정 질문부터 시작(startAt), 유입 경로 추적(source), Hidden Fields 등의 기능을 제공하여 설문 배포의 유연성을 높인다.

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- 4자리 PIN 보호 기능
- 이메일 인증 플로우 (토큰 기반)
- 단일 이메일 응답 제한
- URL 파라미터 기반 데이터 프리필
- startAt 파라미터로 특정 질문부터 시작
- source 파라미터로 유입 경로 추적
- skipPrefilled 파라미터로 프리필된 질문 건너뛰기
- Hidden Fields URL 파라미터 처리
- Survey Close Message 커스터마이징
- 설문 비활성 상태 (paused, completed) 표시

### Out-of-scope
- Single-use 링크 (FSD-017에서 다룸)
- Personal Link (FSD-017에서 다룸)
- reCAPTCHA 스팸 방지 (FSD-020에서 다룸)

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Survey Creator | PIN 설정, 이메일 인증 활성화, 프리필 URL 구성 |
| Survey Respondent | PIN 입력, 이메일 인증 후 설문 응답, 프리필된 데이터 확인 |
| 마케팅 담당자 | source 파라미터로 유입 경로별 응답 분석 |
| CRM 통합 시스템 | 프리필 URL을 자동 생성하여 고객에게 발송 |

## 4. 기능 요구사항

### FR-027: 접근 제어

#### FR-027-01: PIN 보호 (4자리)

PIN은 정확히 4자리 숫자로 구성된다.

**PIN 검증 처리:**
1. 설문 ID와 PIN을 전달받아 검증
2. 설문이 존재하지 않으면 에러 반환
3. PIN이 미설정된 설문이면 검증 없이 통과
4. PIN이 일치하지 않으면 "INVALID_PIN" 에러 반환
5. PIN이 일치하면 설문 데이터 반환

**PIN 입력 UI:**
- OTP 입력 컴포넌트를 사용하여 4자리 입력
- 4자리 입력 완료 시 자동으로 검증 요청
- PIN 불일치 시 에러 표시 후 2초 뒤 자동 초기화

**렌더링 흐름:**
1. 설문에 PIN이 설정되어 있으면 PIN 입력 화면 렌더링
2. 사용자가 4자리 PIN 입력 → 자동 검증
3. PIN 정합 시 → 설문 렌더링
4. PIN 불일치 시 → 에러 표시 후 2초 후 자동 초기화

#### FR-027-02: 이메일 인증

이메일 인증은 3가지 상태로 관리된다:

| 상태 | 설명 |
|------|------|
| not-verified | 인증 전 상태 |
| verified | 인증 완료 (이메일 추출 성공) |
| fishy | 토큰은 있지만 이메일 추출 실패 |

**이메일 인증 플로우:**

1. 사용자가 이메일 주소를 입력
2. 단일 이메일 응답 제한이 활성화된 경우, 해당 이메일로 이미 응답했는지 검사
3. 이미 응답한 이메일이면 "이미 응답 접수됨" 에러 표시
4. 인증 이메일 발송 (설문 ID, 이메일, 설문 이름, Single-use ID, 로케일 포함)
5. 사용자가 이메일의 인증 링크 클릭
6. verify 파라미터를 통해 토큰 검증
7. 검증 성공 시 설문 표시 (인증된 이메일 포함)
8. 검증 실패 시 에러 화면 ("This looks fishy")

**이메일 인증 화면 상태:**
1. **이메일 입력 화면**: 이메일 주소 입력 + "Verify" 버튼
2. **질문 미리보기**: "Just Curious?" → 질문 목록 미리보기 (인증 없이 확인 가능)
3. **이메일 전송 완료**: "Survey sent to {email}" 메시지
4. **에러 화면** (fishy): "This looks fishy" 메시지 + 재시도 안내

**Rate Limiting:**
- 이메일 인증 발송 액션에 IP 기반 Rate Limiting 적용

#### FR-027-03: Survey Close Message 커스터마이징

설문 닫힘 메시지 설정:
- heading: 커스텀 제목 (선택)
- subheading: 커스텀 부제 (선택)
- null 허용

**비활성 상태 표시 로직:**

| 상태 | 아이콘 | 설명 |
|------|--------|------|
| paused | 일시정지 아이콘 | 설문 일시정지 |
| completed | 완료 체크 아이콘 | 설문 완료 |
| link invalid | 도움말 아이콘 | 유효하지 않은 링크 |
| response submitted | 완료 체크 아이콘 | 이미 응답 제출됨 |
| link expired | 캘린더 시계 아이콘 | 링크 만료됨 |

completed 상태에서 커스텀 닫힘 메시지가 설정되어 있으면 해당 메시지를 표시한다.

### FR-028: 데이터 프리필 및 URL 파라미터

#### FR-028-01: 데이터 프리필 시스템

URL 파라미터를 통해 설문 질문에 미리 값을 채울 수 있다.

**프리필 처리 과정:**
1. URL의 모든 파라미터를 순회
2. 예약된 파라미터명(startAt, embed, preview 등)은 건너뜀
3. 파라미터 키와 일치하는 설문 요소(질문) 검색
4. 일치하는 요소가 없으면 건너뜀
5. 요소 타입에 따라 값 검증 수행
6. 검증 통과 시 값 변환 후 프리필 데이터에 추가
7. 하나의 프리필 오류가 다른 프리필에 영향을 주지 않음 (오류 격리)

**URL 프리필 예시:**

| URL 파라미터 형태 | 설명 |
|-------------------|------|
| ?questionId=answer | 텍스트 응답 |
| ?questionId=option-abc123 | 단일 선택 (Option ID) |
| ?questionId=Option1,Option2 | 복수 선택 (라벨, 쉼표 구분) |
| ?npsId=9 | NPS (0-10) |
| ?ratingId=4 | Rating (1-range) |
| ?consentId=accepted | 동의 (accepted/dismissed) |

#### FR-028-02: Element 타입별 검증 규칙

필수 필드에 빈 값이 전달되면 검증 실패로 처리한다.

**타입별 검증 규칙:**

| Element Type | 유효 값 | 검증 세부사항 |
|-------------|---------|-------------|
| OpenText | 임의 문자열 | 항상 유효 |
| MultipleChoiceSingle | Option ID 또는 라벨 | ID 또는 라벨로 옵션 매칭 + "other" 지원 |
| MultipleChoiceMulti | 쉼표 구분 Option ID/라벨 | 각 값 개별 검증, 최대 1개 free-text "other" |
| NPS | 0 ~ 10 | 정수, 범위 검사 |
| Rating | 1 ~ 설정된 범위 (기본값 5) | 정수, 범위 기반 검사 |
| Consent | "accepted" / "dismissed" | 필수 항목일 때 "dismissed" 불가 |
| PictureSelection | 쉼표 구분 인덱스(1-based) | 복수 선택 비허용 시 첫 번째만 사용 |

**검증 결과 유형:**
- 유효하지 않은 결과 (타입 정보 포함)
- 단순 유효 결과: OpenText, NPS, Rating, Consent
- 단일 선택 유효 결과: MultipleChoiceSingle
- 복수 선택 유효 결과: MultipleChoiceMulti
- 이미지 선택 유효 결과: PictureSelection

#### FR-028-03: startAt 파라미터

- ?startAt=start → Welcome Card부터 시작
- ?startAt={elementId} → 해당 질문부터 시작
- 유효하지 않은 ID → URL에서 자동 제거, 처음부터 시작

유효하지 않은 startAt 값은 브라우저 URL에서 자동으로 제거된다.

#### FR-028-04: skipPrefilled 파라미터

- true 설정 시: 프리필된 값이 있는 질문을 자동으로 건너뜀
- false (기본값): 프리필된 값이 표시되지만 사용자가 확인/수정 가능

#### FR-028-05: source 파라미터 (유입 경로 추적)

source 파라미터는 Hidden Fields를 통해 자동 처리된다.

- ?source=newsletter → Hidden Fields에 source 필드가 설정되어 있으면 자동 매핑
- 설문의 Hidden Fields에 포함된 키만 처리
- 알 수 없는 키는 무시됨

#### FR-028-06: 인증된 이메일 Hidden Field 주입

이메일 인증 성공 시 verifiedEmail 키로 Hidden Fields에 자동 추가된다. 이를 통해 응답 데이터에 인증된 이메일이 저장된다.

## 5. 비기능 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-027-01 | PIN 입력 UX | 4자리 OTP 입력 컴포넌트, 자동 검증, 에러 시 2초 자동 초기화 |
| NFR-027-02 | 이메일 인증 보안 | JWT 토큰 기반 인증, IP Rate Limiting 적용 |
| NFR-027-03 | 프리필 오류 격리 | 하나의 프리필 오류가 다른 프리필에 영향 없음 |
| NFR-028-01 | URL 파라미터 정합성 | 유효하지 않은 startAt은 자동 제거 |
| NFR-028-02 | 하위 호환성 | 라벨 기반 프리필과 Option ID 기반 프리필 모두 지원 |

## 6. 정책/제약

| 항목 | 값 |
|------|------|
| PIN 길이 | 정확히 4자리 |
| PIN 형식 | 숫자만 (4자리 숫자) |
| PIN 에러 자동 초기화 | 2초 |
| 이메일 인증 상태 | "not-verified", "verified", "fishy" |
| 이메일 중복 응답 | 단일 이메일 응답 제한 설정 시 차단 |
| NPS 범위 | 0 ~ 10 |
| Rating 범위 | 1 ~ 설정된 범위 (기본 5) |
| Consent 유효값 | "accepted", "dismissed" |
| Picture Selection 인덱스 | 1-based |
| 프리필 예약 ID | startAt, embed, preview 등 시스템 예약 파라미터 |
| MultiChoiceMulti "other" | 최대 1개 free-text 허용 |
| startAt 특수값 | "start" → Welcome Card |
| skipPrefilled | "true" 문자열로 활성화 |
| Autofocus | iframe 내에서 비활성화 |
| 이메일 발송 Rate Limit | IP 기반 Rate Limiting 적용 |

## 7. 수용 기준 (Acceptance Criteria)

| AC-ID | 시나리오 | 기대 결과 |
|-------|----------|----------|
| AC-027-01 | PIN 보호 설문에 접근 | 4자리 PIN 입력 화면 표시 |
| AC-027-02 | 올바른 PIN 입력 | 설문이 정상 렌더링됨 |
| AC-027-03 | 잘못된 PIN 입력 | 에러 표시 후 2초 뒤 입력란 초기화 |
| AC-027-04 | 이메일 인증 활성 설문 접근 | 이메일 입력 화면 표시 |
| AC-027-05 | 이메일 인증 완료 후 접근 | 토큰 검증 후 설문 표시, verifiedEmail Hidden Field에 포함 |
| AC-027-06 | 변조된 인증 토큰으로 접근 | "This looks fishy" 에러 화면 표시 |
| AC-027-07 | 단일 이메일 응답 활성 + 이미 응답한 이메일 | "Response already received" 에러 메시지 |
| AC-027-08 | 완료된 설문 접근 + 커스텀 Close Message | 커스텀 heading/subheading 표시 |
| AC-027-09 | 일시정지 설문 접근 | "Survey paused." 메시지 표시 |
| AC-028-01 | ?questionId=answer 프리필 | 해당 질문에 "answer" 값이 미리 입력됨 |
| AC-028-02 | ?npsId=9 프리필 | NPS 질문에 9가 선택됨 |
| AC-028-03 | ?npsId=11 (범위 초과) | 프리필 무시, 빈 상태로 표시 |
| AC-028-04 | ?startAt={elementId} | 해당 질문부터 시작 |
| AC-028-05 | ?startAt=invalidId | URL에서 startAt 제거, 처음부터 시작 |
| AC-028-06 | ?q1=a&q2=b&skipPrefilled=true | q1, q2 자동 입력 후 다음 질문으로 이동 |
| AC-028-07 | ?source=email (Hidden Field에 source 설정) | 응답 데이터에 source=email 포함 |
| AC-028-08 | ?unknownField=value | 무시됨, 에러 없음 |
| AC-028-09 | MultiChoiceMulti에 2개 이상 other 값 | 프리필 무시 (유효하지 않음) |
| AC-028-10 | Required 필드에 빈 프리필 | 프리필 무시 |
