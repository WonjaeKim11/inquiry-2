# 쿼터 관리 — 요구사항 명세서

> **문서번호**: FSD-014 | **FR 범위**: FR-022
> **라이선스**: Enterprise (쿼터 기능 플래그 필요)

---

## 1. 목적/배경

쿼터(Quota) 관리는 설문 응답 수를 조건별로 제한하는 Enterprise 기능이다. 특정 조건에 맞는 응답이 정해진 한도(limit)에 도달하면 해당 설문을 종료하거나 계속 진행하는 액션을 수행한다. 이를 통해 응답 표본의 균형을 맞추거나(예: 성별, 연령대별 할당), 특정 조건의 응답자를 스크리닝할 수 있다.

쿼터 시스템은 조건부 로직 엔진의 로직 평가 처리를 재사용하여 응답 데이터를 평가하고, 응답-쿼터 연결 테이블을 통해 응답-쿼터 간 관계를 추적한다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- 쿼터 CRUD (생성, 조회, 수정, 삭제)
- 조건 기반 쿼터 평가 (조건부 로직 엔진 재사용)
- 쿼터 초과 시 액션 (endSurvey / continueSurvey)
- 부분 제출(Partial Submission) 카운트 옵션
- 응답-쿼터 연결 테이블을 통한 응답-쿼터 관계 추적
- screenedIn / screenedOut 상태 관리
- Ending Card 연계 (쿼터 초과 시 특정 종료 카드 표시)
- Enterprise 라이선스 검증

### Out-of-scope
- 실시간 대시보드 (별도 Summary 컴포넌트로 처리)
- 쿼터 알림/노티피케이션
- 쿼터 일시 정지/재개

---

## 3. 사용자/이해관계자

| 역할 | 관심 사항 |
|------|----------|
| 시장 조사자 | 표본 균형 맞추기 (성별, 연령대별 할당) |
| 설문 관리자 | 응답 수 한도 관리, 스크리닝 |
| 데이터 분석가 | 쿼터별 응답 분포 확인 |
| 시스템 관리자 | Enterprise 라이선스 관리 |

---

## 4. 기능 요구사항

### FR-022: 쿼터 관리 시스템

#### 4.1 쿼터 데이터 모델

**쿼터 속성**:

| 속성 | 타입 | 설명 | 제약 |
|------|------|------|------|
| id | 문자열 (CUID) | 쿼터 고유 식별자 | 자동 생성 |
| surveyId | 문자열 (CUID) | 소속 설문 ID | 필수 |
| name | 문자열 | 쿼터 이름 | 최소 1자, 설문 내 유일 |
| limit | 숫자 | 응답 한도 | 최소 1 이상 |
| logic | 쿼터 조건 구조 | 조건 정의 | AND/OR 조건 그룹 |
| action | 쿼터 액션 | 한도 초과 시 액션 | endSurvey 또는 continueSurvey |
| endingCardId | 문자열 또는 null | 종료 시 표시할 Ending Card | endSurvey 시 필수 |
| countPartialSubmissions | boolean | 부분 제출도 카운트할지 여부 | - |
| createdAt | 날짜/시간 | 생성일시 | 자동 생성 |
| updatedAt | 날짜/시간 | 수정일시 | 자동 갱신 |

#### 4.2 쿼터 액션 타입

| 액션 | 설명 |
|------|------|
| endSurvey | 쿼터 한도 초과 시 설문 강제 종료, endingCardId에 지정된 종료 카드 표시 |
| continueSurvey | 쿼터 한도 초과해도 설문 계속 진행 (응답은 screenedOut으로 표시) |

#### 4.3 쿼터 입력 검증

**핵심 검증 규칙**: action이 endSurvey인 경우 endingCardId가 반드시 지정되어야 한다. (null이거나 빈 문자열이면 "endingCardId is required when action is endSurvey" 에러 발생)

#### 4.4 쿼터 조건 구조

- 조건부 로직 엔진의 단일 조건(Single Condition)을 재사용
- connector로 AND/OR 연결
- 중첩 조건 그룹은 사용하지 않고 **단일 레벨 조건 배열**만 지원
- 각 조건은 element, variable, hiddenField를 좌측 피연산자로 사용 가능

#### 4.5 응답-쿼터 연결 상태

| 상태 | 설명 |
|------|------|
| screenedIn | 쿼터 조건 충족 + 한도 미초과 → 정상 카운트 |
| screenedOut | 쿼터 조건 충족 + 한도 초과 → 스크리닝 아웃 |

#### 4.6 데이터베이스 모델

**쿼터 테이블**:
- 설문과 1:N 관계 (설문 삭제 시 Cascade 삭제)
- 조건 정보는 JSON 형태로 저장 (기본값: 빈 객체)
- 부분 제출 카운트 기본값: false
- **유니크 제약**: 같은 설문 내에서 쿼터 이름 중복 불가

**응답-쿼터 연결 테이블**:
- 응답과 쿼터의 N:M 관계를 관리
- 복합 기본키: [응답ID, 쿼터ID]
- 카운트 쿼리 최적화를 위한 인덱스: [쿼터ID, 상태]
- 응답 삭제 시 Cascade 삭제
- 쿼터 삭제 시 Cascade 삭제

#### 4.7 쿼터 평가 프로세스

응답 제출/업데이트 시 다음 프로세스를 수행:

1. 해당 설문의 모든 쿼터 조회
2. 설문 정보 조회
3. 조건 평가: 각 쿼터의 조건을 로직 평가 엔진으로 평가하여 조건 충족(passedQuotas) / 조건 미충족(failedQuotas) 분류
4. 한도 확인 및 액션 수행: screenedIn 카운트 조회, 한도 초과 여부 확인, 응답-쿼터 연결 레코드 생성/수정, endSurvey 시 응답 완료 처리

#### 4.8 쿼터 조건 평가

- 조건부 로직 엔진의 로직 평가 처리를 직접 재사용
- 쿼터의 조건 객체에 id를 추가하여 조건 그룹 형식으로 변환

#### 4.9 한도 확인 및 액션 수행

**카운트 로직**:
1. screenedIn 상태의 기존 응답 수 카운트 (현재 응답 제외)
2. countPartialSubmissions=true이면 미완료 응답도 카운트
3. countPartialSubmissions=false이면 완료된 응답만 카운트
4. screenedIn 카운트 >= 한도(limit)이면 해당 쿼터는 한도 초과(full)
5. 한도 초과된 첫 번째 쿼터의 액션을 적용

**부분 제출 필터링**:
- 응답이 완료되지 않았고 endSurvey 액션이 아닌 경우, countPartialSubmissions=true인 쿼터만 처리

#### 4.10 응답-쿼터 연결 레코드 관리

**처리 흐름**:
1. **조건 미충족 쿼터**: 기존 연결 레코드 삭제
2. **한도 초과 쿼터**: screenedOut 상태로 생성/업데이트
3. **한도 미초과 쿼터**: screenedIn 상태로 생성 (중복 건너뜀)

#### 4.11 endSurvey 액션 처리

- 응답의 완료 상태를 true로 설정
- endingId를 쿼터의 endingCardId로 설정하여 특정 종료 카드 표시

#### 4.12 쿼터 초과 응답 구조

쿼터 초과 시 응답에는 다음 정보가 포함된다:
- 쿼터 초과 여부 (quotaFull: true)
- 초과된 쿼터 ID
- 수행할 액션 (endSurvey 또는 continueSurvey)
- endSurvey인 경우 종료 카드 ID

#### 4.13 Enterprise 라이선스 검증

쿼터 기능은 Enterprise 라이선스의 쿼터 기능 플래그가 활성화되어야 사용 가능하다.

---

## 5. 비기능 요구사항

| ID | 요구사항 | 기준 |
|----|---------|------|
| NFR-014-01 | 쿼터 평가는 트랜잭션 내에서 수행 | 데이터베이스 트랜잭션 사용 |
| NFR-014-02 | 카운트 쿼리 최적화 | 쿼터ID/상태 인덱스 활용 |
| NFR-014-03 | 에러 발생 시 안전 처리 | 예외 처리로 설문 종료 false 반환 |
| NFR-014-04 | 같은 설문 내 쿼터 이름 유일 | 유니크 제약 조건 적용 |
| NFR-014-05 | Cascade 삭제 | Survey/Response 삭제 시 관련 쿼터/연결 자동 삭제 |
| NFR-014-06 | 동시성 처리 | 중복 건너뜀 옵션으로 중복 레코드 방지 |

---

## 6. 정책/제약

| 항목 | 제약 값 |
|------|--------|
| 최소 limit | 1 이상 |
| 쿼터 이름 최소 길이 | 1자 |
| endSurvey 시 endingCardId | 필수 (not null, not empty) |
| 쿼터 이름 유일성 범위 | 동일 설문 내 |
| 부분 제출 카운트 기본값 | false |
| 조건 기본값 | 빈 객체 |
| 응답-쿼터 연결 기본키 | [응답ID, 쿼터ID] 복합키 |
| 라이선스 기능 플래그 | 쿼터(quotas) |
| 쿼터 조건 구조 | 단일 레벨 (중첩 그룹 없음) |
| 라이선스 캐시 TTL | 24시간 (성공) / 10분 (실패) |

---

## 7. 수용 기준 (Acceptance Criteria)

| AC ID | 기준 | 검증 방법 |
|-------|------|----------|
| AC-022-01 | Enterprise 라이선스 없이 쿼터 기능 접근 불가 | 라이선스 체크 후 기능 비활성화 확인 |
| AC-022-02 | 쿼터 생성 시 name, limit, action 필수 | 유효성 검증 실패 확인 |
| AC-022-03 | endSurvey 액션 시 endingCardId 필수 | "endingCardId is required" 에러 확인 |
| AC-022-04 | limit=0 설정 불가 | "Limit must be greater than 0" 에러 확인 |
| AC-022-05 | 조건 충족 + 한도 미초과 시 screenedIn 기록 | 응답-쿼터 연결 status=screenedIn 확인 |
| AC-022-06 | 조건 충족 + 한도 초과 시 screenedOut 기록 | 응답-쿼터 연결 status=screenedOut 확인 |
| AC-022-07 | endSurvey 액션 시 응답 finished=true 설정 | Response 레코드 finished 필드 확인 |
| AC-022-08 | endSurvey 시 지정된 Ending Card 표시 | endingId가 endingCardId와 일치 확인 |
| AC-022-09 | continueSurvey 시 설문 계속 진행 | shouldEndSurvey=false 확인 |
| AC-022-10 | countPartialSubmissions=false 시 미완료 응답 미카운트 | finished=false 응답 카운트 제외 확인 |
| AC-022-11 | countPartialSubmissions=true 시 미완료 응답도 카운트 | 모든 응답 카운트 포함 확인 |
| AC-022-12 | 같은 설문 내 쿼터 이름 중복 불가 | DB 유니크 제약 에러 확인 |
| AC-022-13 | 쿼터 평가 에러 시 설문 계속 진행 | shouldEndSurvey: false 반환 확인 |
| AC-022-14 | 조건 미충족 쿼터의 기존 연결 삭제 | 미충족 쿼터 연결 삭제 확인 |
| AC-022-15 | Survey 삭제 시 관련 쿼터 자동 삭제 | Cascade 삭제 확인 |
