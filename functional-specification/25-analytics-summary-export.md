# 기능 명세서: 분석, 요약 및 내보내기 (Functional Specification)

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | 1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-025 (분석, 요약 및 내보내기 요구사항 명세서) |
| FR 범위 | FR-037 ~ FR-038 |
| 라이선스 | Community |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

설문 응답 데이터에 대한 통합 분석 기능(Summary)과 데이터 내보내기(Export) 기능의 상세 동작을 정의한다. Summary 페이지에서 질문별 응답 집계, NPS/CSAT 스코어 계산, Drop-off 분석, 완료율 등의 메타 통계를 시각적으로 표시하고, 응답 데이터를 CSV 또는 XLSX 형식으로 내보내어 외부 도구에서 추가 분석할 수 있도록 한다.

### 2.2 범위

**포함 (In-scope)**:
- Summary 메타 통계 (Impressions, Starts, Completed, Drop-offs, TTC)
- 질문 유형별 Summary 컴포넌트 (NPS, Rating, Multiple Choice 등 14종)
- NPS 스코어 계산 (Promoter/Passive/Detractor)
- CSAT 만족도 계산 (Range별)
- Drop-off 분석 (질문별 이탈률)
- 완료율(Completion Rate) 계산
- CSV/XLSX 내보내기
- 필터 적용 내보내기
- 히든 필드, 변수, 메타데이터 포함 내보내기

**제외 (Out-of-scope)**:
- AI 기반 응답 분석 (별도 모듈)
- 실시간 대시보드 / 차트 위젯
- 응답 카드/테이블 뷰 (FSD-021 참조)

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| Survey Analyst | Summary 페이지에서 분석 결과를 확인하는 사용자 |
| Data Exporter | 응답 데이터를 CSV/XLSX로 내보내기하는 사용자 |
| Project Owner/Manager | 설문 성과를 모니터링하는 관리자 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Impressions | 설문이 사용자에게 노출된 횟수 |
| Starts | 설문 응답을 시작한 횟수 |
| Completed | 설문을 끝까지 완료한 응답 수 |
| Drop-off | 설문 진행 중 이탈한 응답 수 |
| TTC (Time to Complete) | 설문 응답 완료까지 소요된 시간 |
| NPS (Net Promoter Score) | 고객 추천 의향을 -100~+100 범위로 측정하는 지표 |
| CSAT (Customer Satisfaction) | 고객 만족도를 백분율로 측정하는 지표 |
| Promoter | NPS에서 9-10점을 부여한 추천 의향이 높은 응답자 |
| Passive | NPS에서 7-8점을 부여한 중립적 응답자 |
| Detractor | NPS에서 0-6점을 부여한 비추천 의향 응답자 |
| Dismissed | TTC가 존재하지만 실제 응답이 없는 경우 (질문 스킵) |
| Range | Rating 질문의 점수 범위 (3, 4, 5, 6, 7, 10) |
| Cursor 기반 페이지네이션 | skip/offset 대신 cursor를 사용하여 데이터를 순차 조회하는 방식 |
| Display Count | 설문의 총 노출 수 |
| Quotas | 설문 응답 수 제한 조건 (유료 기능) |
| Hidden Fields | 설문 URL 파라미터 등을 통해 전달되는 숨겨진 데이터 필드 |
| Object URL | 브라우저에서 Blob 객체에 대해 생성하는 임시 URL |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
[사용자 브라우저]
    │
    ├── Summary 페이지 ──────────────────┐
    │   ├── 메타 통계 컴포넌트            │
    │   ├── 질문별 Summary 컴포넌트       │
    │   ├── Drop-off 분석 컴포넌트        │
    │   └── NPS/CSAT 시각화 컴포넌트      │
    │                                     │
    ├── 내보내기 기능 ───────────────────┐ │
    │   ├── CSV 생성기                   │ │
    │   ├── XLSX 생성기                  │ │
    │   └── 파일 다운로드 핸들러          │ │
    │                                     │ │
    └─── API 요청 ──────────────────────┘ │
         │                                 │
    [서버 (API Layer)]                     │
         │                                 │
         ├── Summary 데이터 조회 서비스 ◄──┘
         │   ├── 응답 데이터 로딩 (Cursor 페이지네이션)
         │   ├── 메타 통계 계산
         │   ├── 질문별 집계 계산
         │   └── Drop-off 분석 엔진
         │
         ├── 내보내기 데이터 생성 서비스
         │   ├── 응답 데이터 로딩 (Cursor 페이지네이션)
         │   ├── 헤더 구성
         │   ├── 데이터 변환 (CSV/XLSX)
         │   └── Storage URL 변환
         │
         └── [데이터베이스]
              ├── Survey (설문)
              ├── Response (응답)
              ├── Display (노출)
              └── Quota (쿼터)
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 관련 FR | 우선순위 |
|---------|--------|---------|---------|
| FN-025-01 | Summary 메타 통계 | FR-037 | 높음 |
| FN-025-02 | NPS 스코어 계산 및 시각화 | FR-037 | 높음 |
| FN-025-03 | CSAT 만족도 계산 | FR-037 | 높음 |
| FN-025-04 | Drop-off 분석 | FR-037 | 높음 |
| FN-025-05 | 질문 유형별 Summary 컴포넌트 | FR-037 | 높음 |
| FN-025-06 | Summary 데이터 로딩 | FR-037 | 높음 |
| FN-025-07 | Summary 필터 적용 | FR-037 | 중간 |
| FN-025-08 | CSV 내보내기 | FR-038 | 높음 |
| FN-025-09 | XLSX 내보내기 | FR-038 | 높음 |
| FN-025-10 | 선택된 행 내보내기 | FR-038 | 중간 |

### 3.3 기능 간 관계도

```
[FN-025-06 Summary 데이터 로딩]
    │
    ├──▶ [FN-025-01 메타 통계] ──▶ [FN-025-07 필터 적용]
    │
    ├──▶ [FN-025-02 NPS 계산] ──▶ [FN-025-07 필터 적용]
    │
    ├──▶ [FN-025-03 CSAT 계산] ──▶ [FN-025-07 필터 적용]
    │
    ├──▶ [FN-025-04 Drop-off 분석]
    │
    └──▶ [FN-025-05 질문별 Summary]

[FN-025-08 CSV 내보내기] ◄──┐
                              ├── [FN-025-07 필터 적용]
[FN-025-09 XLSX 내보내기] ◄──┘

[FN-025-10 선택된 행 내보내기] ──▶ [FN-025-08 CSV] / [FN-025-09 XLSX]
```

---

## 4. 상세 기능 명세

### 4.1 Summary 메타 통계

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-01 |
| 기능명 | Summary 메타 통계 |
| 관련 요구사항 ID | FR-037, AC-037-01 |
| 우선순위 | 높음 |
| 기능 설명 | 설문의 전체 응답 데이터를 기반으로 노출 수, 시작 수, 완료 수, 이탈 수, 평균 소요 시간, 쿼터 완료율을 계산하여 Summary 페이지 상단에 표시한다. |

#### 4.1.2 선행 조건 (Preconditions)

- 사용자가 해당 설문의 Summary 페이지에 접근 권한을 보유하고 있어야 한다.
- 설문이 1건 이상 노출(Display)된 이력이 존재하거나, 노출 수가 0인 경우에도 페이지 접근은 가능해야 한다.
- Summary 데이터 로딩(FN-025-06)이 완료되어야 한다.

#### 4.1.3 후행 조건 (Postconditions)

- 6개의 메타 통계 항목(Impressions, Starts, Completed, Drop-offs, TTC, Quotas Completed)이 UI에 표시된다.
- 각 통계 항목의 수치와 비율이 정확하게 계산된 상태이다.
- Drop-offs 항목은 클릭 가능한 상태로 렌더링된다.

#### 4.1.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | Summary 데이터 로딩(FN-025-06)에서 전체 응답 데이터, Display Count, Quotas를 수신한다. |
| 2 | 시스템 | 다음 공식으로 메타 통계를 계산한다: |
|   |        | - 시작률(startsPercentage) = (총 응답 수 / 노출 수) * 100 |
|   |        | - 완료율(completedPercentage) = (완료 응답 수 / 노출 수) * 100 |
|   |        | - 이탈 수(dropOffCount) = 총 응답 수 - 완료 응답 수 |
|   |        | - 이탈률(dropOffPercentage) = (이탈 수 / 총 응답 수) * 100 |
|   |        | - TTC 평균 = 전체 소요 시간(_total) 필드가 존재하는 응답들의 산술 평균 |
|   |        | - 쿼터 완료율 = (완료된 쿼터 수 / 전체 쿼터 수) * 100 |
| 3 | 시스템 | TTC 평균값을 시간 형식으로 변환한다: |
|   |        | - 60초 이상: "Xm Xs" (분+초) 형식 |
|   |        | - 60초 미만: "Xs" (초) 형식 |
|   |        | - 소수점 2자리까지 표시 |
| 4 | 시스템 | 6개 메타 통계를 다음 형식으로 UI에 렌더링한다: |
|   |        | - Impressions: 숫자 |
|   |        | - Starts: 숫자 + 시작률% |
|   |        | - Completed: 숫자 + 완료율% |
|   |        | - Drop-offs: 숫자 + 이탈률% (클릭 가능) |
|   |        | - Time to Complete: "Xm Xs" 또는 "Xs" 형식 |
|   |        | - Quotas Completed: 숫자 + 완료율% |
| 5 | 사용자 | 메타 통계 영역을 확인한다. |

#### 4.1.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-01-01 | 쿼터가 설정되어 있지 않거나 유료 기능이 비활성화된 경우 | Quotas Completed 항목을 표시하지 않는다. |
| AF-01-02 | 필터가 적용된 경우 | 필터 조건에 일치하는 응답만으로 메타 통계를 재계산한다. Display Count도 필터에 맞게 조정된다. |
| AF-01-03 | 사용자가 Drop-offs 수치를 클릭한 경우 | Drop-off 상세 분석 뷰(FN-025-04)로 전환한다. |

#### 4.1.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-01-01 | 노출 수(Impressions)가 0인 경우 | 시작률, 완료율, 이탈률 모두 0%로 표시한다. |
| EF-01-02 | TTC(_total) 필드가 존재하는 응답이 0건인 경우 | TTC 항목을 "N/A" 또는 빈 값으로 표시한다. |
| EF-01-03 | 총 응답 수가 0인 경우 | 이탈률을 0%로 표시한다 (0으로 나누기 방지). |

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-01-01 | 모든 비율 계산에서 소수점 2자리까지 표시한다. |
| BR-01-02 | 노출 수가 0이면 모든 비율은 0%로 처리한다. |
| BR-01-03 | TTC 시간 형식 변환 기준: 60초 이상이면 "Xm Xs", 60초 미만이면 "Xs"로 표시한다. |
| BR-01-04 | Quotas Completed는 유료 기능이 허용되고, 해당 설문에 쿼터가 존재하는 경우에만 표시한다. |
| BR-01-05 | 이탈 수 = 총 응답 수 - 완료 응답 수. 이 값은 항상 0 이상이어야 한다. |

#### 4.1.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| displayCount | integer | 필수 | 0 이상의 정수 |
| totalResponseCount | integer | 필수 | 0 이상의 정수 |
| completedResponseCount | integer | 필수 | 0 이상, totalResponseCount 이하 |
| ttcValues (배열) | number[] | 선택 | 각 요소는 0 이상의 숫자 (초 단위) |
| completedQuotaCount | integer | 선택 | 0 이상의 정수 |
| totalQuotaCount | integer | 선택 | 0 이상의 정수 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| impressions | integer | 노출 수 |
| starts | integer | 시작 수 |
| startsPercentage | number | 시작률 (소수점 2자리) |
| completed | integer | 완료 수 |
| completedPercentage | number | 완료율 (소수점 2자리) |
| dropOffCount | integer | 이탈 수 |
| dropOffPercentage | number | 이탈률 (소수점 2자리) |
| ttcAverage | string | 평균 소요 시간 ("Xm Xs" 또는 "Xs") |
| quotasCompleted | integer | 쿼터 완료 수 (선택) |
| quotasCompletedPercentage | number | 쿼터 완료율 (선택, 소수점 2자리) |

#### 4.1.9 화면/UI 요구사항

- 메타 통계 6개 항목을 Summary 페이지 상단에 수평 배열로 표시한다.
- 각 항목은 메인 숫자(큰 글씨)와 보조 비율(작은 글씨)로 구성한다.
- Drop-offs 항목은 클릭 가능한 스타일(밑줄 또는 포인터 커서)로 렌더링한다.
- Quotas Completed는 조건부 렌더링한다 (유료 기능 + 쿼터 존재 시에만).

#### 4.1.10 비기능 요구사항

- Display Count와 Quotas 데이터를 병렬로 조회하여 로딩 시간을 단축한다.
- Meta 계산과 Element Summary를 병렬로 실행한다.

---

### 4.2 NPS 스코어 계산 및 시각화

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-02 |
| 기능명 | NPS 스코어 계산 및 시각화 |
| 관련 요구사항 ID | FR-037, AC-037-02 |
| 우선순위 | 높음 |
| 기능 설명 | NPS 질문 유형의 응답 데이터를 기반으로 Promoter/Passive/Detractor/Dismissed를 분류하고, NPS 스코어를 계산하며, Aggregated 뷰, Individual 뷰, HalfCircle 게이지로 시각화한다. |

#### 4.2.2 선행 조건 (Preconditions)

- 설문에 NPS 질문 유형이 1개 이상 포함되어 있어야 한다.
- 해당 NPS 질문에 대한 응답 데이터가 로딩되어 있어야 한다.

#### 4.2.3 후행 조건 (Postconditions)

- NPS 스코어(-100 ~ +100)가 계산되어 HalfCircle 게이지로 표시된다.
- Promoter/Passive/Detractor/Dismissed 각 그룹의 카운트 및 비율이 표시된다.
- 0~10 개별 점수별 카운트가 막대 그래프로 표시된다.

#### 4.2.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | NPS 질문에 대한 전체 응답을 조회한다. |
| 2 | 시스템 | 각 응답을 다음 기준으로 분류한다: |
|   |        | - 9~10점: Promoter |
|   |        | - 7~8점: Passive |
|   |        | - 0~6점: Detractor |
|   |        | - TTC > 0이면서 응답 값이 없는 경우: Dismissed |
| 3 | 시스템 | 0~10 각 점수별 카운트를 집계한다. |
| 4 | 시스템 | NPS 스코어를 계산한다: NPS = Promoter% - Detractor% |
|   |        | (Dismissed는 계산에서 제외, 실제 응답이 있는 건만 대상) |
| 5 | 시스템 | NPS 투명도를 점수 구간별로 계산한다: |
|   |        | - 0~6점(Detractor): 0.3 ~ 0.6 범위 |
|   |        | - 7~8점(Passive): 0.6 ~ 0.8 범위 |
|   |        | - 9~10점(Promoter): 0.8 ~ 1.0 범위 |
| 6 | 시스템 | Aggregated 뷰를 렌더링한다: Promoters/Passives/Detractors/Dismissed 각 비율 + Progress Bar |
| 7 | 시스템 | Individual 뷰를 렌더링한다: 0~10 개별 점수 막대 그래프 (11개 바) |
| 8 | 시스템 | HalfCircle 게이지를 렌더링한다: NPS 스코어를 반원 차트로 시각화 |
| 9 | 사용자 | NPS Summary 컴포넌트를 확인한다. |

#### 4.2.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-02-01 | 사용자가 Aggregated 뷰의 특정 그룹(Promoter/Passive/Detractor)을 클릭한 경우 | 해당 그룹의 응답만 표시하도록 필터를 적용한다. |
| AF-02-02 | 사용자가 Individual 뷰의 특정 점수 바를 클릭한 경우 | 해당 점수의 응답만 표시하도록 필터를 적용한다. |
| AF-02-03 | 필터가 적용된 경우 | 필터 조건에 일치하는 응답만으로 NPS를 재계산한다. |

#### 4.2.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-02-01 | NPS 응답이 0건인 경우 (모두 Dismissed) | NPS 스코어를 0으로 표시하고, 그래프를 빈 상태로 렌더링한다. |

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-02-01 | Promoter: 9~10점, Passive: 7~8점, Detractor: 0~6점으로 고정 분류한다. |
| BR-02-02 | NPS 스코어 = (Promoter수/유효응답수 * 100) - (Detractor수/유효응답수 * 100). 범위는 -100 ~ +100이다. |
| BR-02-03 | Dismissed(TTC > 0, 응답 없음)는 NPS 스코어 계산에서 제외한다. |
| BR-02-04 | NPS 투명도는 Detractor(0.3~0.6), Passive(0.6~0.8), Promoter(0.8~1.0) 범위 내에서 점수에 비례하여 할당한다. |

#### 4.2.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| npsResponses | array | 필수 | 각 요소는 {value: number(0-10) 또는 null, ttc: number} |
| questionId | string | 필수 | 유효한 NPS 질문 ID |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| npsScore | number | NPS 스코어 (-100 ~ +100) |
| promoterCount | integer | Promoter 수 |
| promoterPercentage | number | Promoter 비율 (소수점 2자리) |
| passiveCount | integer | Passive 수 |
| passivePercentage | number | Passive 비율 (소수점 2자리) |
| detractorCount | integer | Detractor 수 |
| detractorPercentage | number | Detractor 비율 (소수점 2자리) |
| dismissedCount | integer | Dismissed 수 |
| dismissedPercentage | number | Dismissed 비율 (소수점 2자리) |
| individualScores | object | 0~10 각 점수별 카운트 (11개 키) |

#### 4.2.9 화면/UI 요구사항

- **Aggregated 뷰**: Promoters/Passives/Detractors/Dismissed 각각 비율 표시 + 색상 구분된 Progress Bar
- **Individual 뷰**: 0~10 개별 점수에 대한 수평/수직 막대 그래프 (총 11개 바), 투명도 적용
- **HalfCircle 게이지**: 반원 형태의 차트에서 NPS 스코어를 바늘 또는 색상 그래디언트로 시각화
- 각 그룹/점수 영역은 클릭 가능하며, 클릭 시 해당 응답으로 필터링

#### 4.2.10 비기능 요구사항

- 대량 응답(수만 건 이상)에서도 NPS 계산 및 렌더링이 지연 없이 수행되어야 한다.

---

### 4.3 CSAT 만족도 계산

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-03 |
| 기능명 | CSAT 만족도 계산 |
| 관련 요구사항 ID | FR-037, AC-037-03 |
| 우선순위 | 높음 |
| 기능 설명 | Rating 질문 유형의 응답 데이터를 기반으로 Range별 만족 기준에 따라 CSAT 만족도를 계산하고, 평균 점수, 점수별 분포, 스킵 수와 함께 표시한다. |

#### 4.3.2 선행 조건 (Preconditions)

- 설문에 Rating 질문 유형이 1개 이상 포함되어 있어야 한다.
- 해당 Rating 질문에 대한 응답 데이터가 로딩되어 있어야 한다.
- Rating 질문에 Range(3, 4, 5, 6, 7, 10 중 하나)가 설정되어 있어야 한다.

#### 4.3.3 후행 조건 (Postconditions)

- CSAT%(만족 비율)가 계산되어 표시된다.
- 평균 점수가 소수점 2자리까지 표시된다.
- 점수별 분포 및 스킵 수가 표시된다.

#### 4.3.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | Rating 질문에 대한 전체 응답과 해당 질문의 Range 값을 조회한다. |
| 2 | 시스템 | Range에 따른 "만족" 점수 기준을 결정한다: |
|   |        | - Range 3: 3점만 만족 |
|   |        | - Range 4: 3, 4점 만족 |
|   |        | - Range 5: 4, 5점 만족 |
|   |        | - Range 6: 5, 6점 만족 |
|   |        | - Range 7: 6, 7점 만족 |
|   |        | - Range 10: 8, 9, 10점 만족 |
| 3 | 시스템 | 만족 응답 수(Satisfied Count)를 집계한다. |
| 4 | 시스템 | CSAT%를 계산한다: CSAT% = (Satisfied Count / Total Response Count) * 100 |
| 5 | 시스템 | 평균 점수를 계산한다: 전체 응답 점수의 산술 평균 (소수점 2자리) |
| 6 | 시스템 | 각 점수별 응답 수 분포를 집계한다. |
| 7 | 시스템 | 스킵 수를 집계한다 (TTC > 0이면서 응답 없음). |
| 8 | 시스템 | Rating Summary UI를 렌더링한다: 평균 점수, 응답 수, 점수별 분포, 스킵 수, CSAT(만족 수 및 만족 비율). |
| 9 | 사용자 | Rating Summary 컴포넌트를 확인한다. |

#### 4.3.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-03-01 | 필터가 적용된 경우 | 필터 조건에 일치하는 응답만으로 CSAT를 재계산한다. |

#### 4.3.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-03-01 | Rating 응답이 0건인 경우 | CSAT%를 0%, 평균 점수를 0으로 표시한다. |

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-03-01 | CSAT "만족" 기준은 Range별로 고정되며, 아래 매핑을 따른다: Range 3 -> {3}, Range 4 -> {3,4}, Range 5 -> {4,5}, Range 6 -> {5,6}, Range 7 -> {6,7}, Range 10 -> {8,9,10} |
| BR-03-02 | CSAT% = (Satisfied Count / Total Response Count) * 100. 소수점 2자리까지 표시한다. |
| BR-03-03 | 평균 점수는 소수점 2자리까지 표시한다. |
| BR-03-04 | Total Response Count가 0이면 CSAT%는 0%로 처리한다. |

#### 4.3.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| ratingResponses | array | 필수 | 각 요소는 {value: number, ttc: number} |
| range | integer | 필수 | 3, 4, 5, 6, 7, 10 중 하나 |
| questionId | string | 필수 | 유효한 Rating 질문 ID |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| averageScore | number | 평균 점수 (소수점 2자리) |
| totalResponseCount | integer | 전체 응답 수 |
| satisfiedCount | integer | 만족 응답 수 |
| csatPercentage | number | CSAT 만족 비율 (소수점 2자리) |
| scoreDistribution | object | 각 점수별 응답 수 |
| skippedCount | integer | 스킵된 응답 수 |

#### 4.3.9 화면/UI 요구사항

- 평균 점수를 큰 숫자로 표시한다.
- 점수별 분포를 막대 그래프 또는 비율 바로 표시한다.
- CSAT%를 만족 수와 함께 표시한다.
- 스킵 수를 별도 항목으로 표시한다.

#### 4.3.10 비기능 요구사항

- 해당 없음 (일반 성능 요구사항에 포함).

---

### 4.4 Drop-off 분석

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-04 |
| 기능명 | Drop-off 분석 |
| 관련 요구사항 ID | FR-037, AC-037-04 |
| 우선순위 | 높음 |
| 기능 설명 | 설문의 각 질문별 노출 수(Impressions), 이탈 수(Drop-off Count), 이탈률(Drop-off %), 평균 TTC를 계산하고, 설문 로직(조건 분기)을 시뮬레이션하여 실제 질문 경로를 추적한다. |

#### 4.4.2 선행 조건 (Preconditions)

- 설문에 질문이 1개 이상 포함되어 있어야 한다.
- 설문의 응답 데이터와 설문 구조(질문 순서, 조건 분기 로직)가 로딩되어 있어야 한다.

#### 4.4.3 후행 조건 (Postconditions)

- 각 질문에 대한 Impressions, Drop-off Count, Drop-off %, 평균 TTC가 테이블 형태로 표시된다.

#### 4.4.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | 전체 응답 데이터와 설문 구조(질문 목록, 조건 분기 로직)를 로딩한다. |
| 2 | 시스템 | 각 응답에 대해 설문 로직(조건 분기)을 시뮬레이션하여 해당 응답자가 거친 질문 경로를 추적한다. |
| 3 | 시스템 | 각 질문별로 Impressions(노출 수)를 집계한다: 해당 질문이 응답자에게 노출된 횟수. |
| 4 | 시스템 | 각 질문별로 Drop-off Count(이탈 수)를 집계한다: 해당 질문 이후 응답을 중단한 건수. |
| 5 | 시스템 | 각 질문별 평균 TTC를 계산한다 (초 단위, 소수점 2자리). |
| 6 | 시스템 | Drop-off 분석 테이블을 렌더링한다: |
|   |        | - Questions: 질문 아이콘 + 제목 |
|   |        | - TTC: 평균 소요 시간 (초, N/A) |
|   |        | - Impressions: 노출 수 |
|   |        | - Drop-offs: 이탈 수 + 이탈 비율(%) |
| 7 | 사용자 | Drop-off 분석 테이블을 확인한다. |

#### 4.4.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-04-01 | Welcome Card가 비활성화된 경우 | 첫 번째 질문의 Impressions를 displayCount(전체 노출 수)로 대체한다. |

#### 4.4.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-04-01 | 특정 질문에 대한 TTC 데이터가 없는 경우 | 해당 질문의 TTC를 "N/A"로 표시한다. |
| EF-04-02 | 응답 데이터가 0건인 경우 | 모든 질문의 Impressions와 Drop-off를 0으로 표시한다. |

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-04-01 | Drop-off 분석은 설문의 조건 분기 로직을 반드시 반영하여 질문 경로를 추적해야 한다. |
| BR-04-02 | Welcome Card 비활성화 시 첫 질문의 Impressions는 displayCount로 대체한다. |
| BR-04-03 | TTC는 초 단위로 소수점 2자리까지 표시한다. |
| BR-04-04 | 이탈률 = (해당 질문의 이탈 수 / 해당 질문의 노출 수) * 100. |

#### 4.4.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| responses | array | 필수 | 전체 응답 데이터 (응답 값, TTC 포함) |
| surveyStructure | object | 필수 | 질문 목록, 조건 분기 로직 포함 |
| displayCount | integer | 필수 | 0 이상의 정수 |
| welcomeCardEnabled | boolean | 필수 | Welcome Card 활성화 여부 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| questionDropoffs | array | 각 질문별 {questionId, questionTitle, questionIcon, impressions, dropOffCount, dropOffPercentage, avgTtc} |

#### 4.4.9 화면/UI 요구사항

- 테이블 형태로 4개 열(Questions, TTC, Impressions, Drop-offs)을 표시한다.
- Questions 열에는 질문 유형 아이콘과 제목을 함께 표시한다.
- Drop-offs 열에는 이탈 수와 이탈률(%)을 함께 표시한다.

#### 4.4.10 비기능 요구사항

- Drop-off 계산은 Meta 통계와 병렬로 실행하여 로딩 시간을 단축한다.

---

### 4.5 질문 유형별 Summary 컴포넌트

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-05 |
| 기능명 | 질문 유형별 Summary 컴포넌트 |
| 관련 요구사항 ID | FR-037 |
| 우선순위 | 높음 |
| 기능 설명 | 14가지 질문 유형에 대해 각각에 적합한 형태의 Summary 분석 컴포넌트를 제공한다. |

#### 4.5.2 선행 조건 (Preconditions)

- Summary 데이터 로딩(FN-025-06)이 완료되어야 한다.
- 해당 질문 유형에 대한 응답이 1건 이상 존재해야 한다.

#### 4.5.3 후행 조건 (Postconditions)

- 각 질문 유형에 맞는 분석 결과가 해당 Summary 컴포넌트에 표시된다.

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | 설문에 포함된 모든 질문의 유형을 식별한다. |
| 2 | 시스템 | 각 질문 유형에 맞는 Summary 컴포넌트를 매핑한다. |
| 3 | 시스템 | 각 컴포넌트에 해당 질문의 응답 데이터를 전달한다 (최대 50건 샘플). |
| 4 | 시스템 | 질문 유형별로 다음과 같이 분석 결과를 렌더링한다: |

**질문 유형별 분석 내용:**

| 질문 유형 | 주요 분석 내용 | 표시 형식 |
|-----------|--------------|----------|
| OpenText | 텍스트 응답 샘플 | 최대 50건의 텍스트 목록 |
| MultipleChoice (Single) | 선택지별 카운트/비율 | 막대 그래프 또는 비율 바 |
| MultipleChoice (Multi) | 선택지별 카운트/비율 | 막대 그래프 또는 비율 바 |
| PictureSelection | 이미지별 선택 카운트/비율 | 이미지 갤러리 + 비율 |
| Rating | 평균 점수, CSAT, 점수별 분포 | FN-025-03 참조 |
| NPS | NPS 스코어, Promoter/Passive/Detractor | FN-025-02 참조 |
| CTA | CTR (Click-Through Rate) | 클릭률 수치 |
| Consent | 수락/스킵 비율 | 비율 바 |
| Date | 날짜 응답 샘플 | 최대 50건의 날짜 목록 |
| FileUpload | 파일 목록 | 파일명 + 링크 목록 |
| Cal | 예약/스킵 비율 | 비율 바 |
| Matrix | 행-열 교차 백분율 | 교차 테이블 (히트맵) |
| Address | 주소 응답 샘플 | 최대 50건의 주소 목록 |
| ContactInfo | 연락처 응답 샘플 | 최대 50건의 연락처 목록 |
| Ranking | 선택지별 평균 순위 | 순위별 막대 그래프 |
| HiddenFields | 히든 필드 값 샘플 | 최대 50건의 키-값 목록 |

#### 4.5.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-05-01 | 필터가 적용된 경우 | 필터 조건에 일치하는 응답만으로 각 컴포넌트의 데이터를 재계산한다. |

#### 4.5.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-05-01 | 특정 질문에 대한 응답이 0건인 경우 | 해당 컴포넌트에 "응답 없음" 또는 빈 상태 메시지를 표시한다. |

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-05-01 | 각 질문 유형별 샘플 데이터는 최대 50건으로 제한한다. |
| BR-05-02 | MultipleChoice, PictureSelection, Ranking 등의 카운트/비율은 전체 응답 기준으로 계산한다 (샘플이 아닌 전체). |

#### 4.5.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| questionType | string | 필수 | 지원 유형 중 하나 |
| questionId | string | 필수 | 유효한 질문 ID |
| responses | array | 필수 | 해당 질문에 대한 응답 배열 |
| questionConfig | object | 필수 | 질문의 설정 정보 (선택지, Range 등) |

**출력 데이터:** 질문 유형별로 상이함 (각 유형의 분석 결과 객체).

#### 4.5.9 화면/UI 요구사항

- 각 질문 유형별 전용 Summary 컴포넌트를 사용한다.
- 설문의 질문 순서대로 Summary 컴포넌트를 나열한다.
- 각 컴포넌트 상단에 질문 제목과 유형 아이콘을 표시한다.

#### 4.5.10 비기능 요구사항

- 샘플 데이터 제한(50건)을 적용하여 대량 데이터에서도 렌더링 성능을 유지한다.

---

### 4.6 Summary 데이터 로딩

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-06 |
| 기능명 | Summary 데이터 로딩 |
| 관련 요구사항 ID | FR-037 |
| 우선순위 | 높음 |
| 기능 설명 | Cursor 기반 페이지네이션으로 전체 응답 데이터를 배치 로딩하고, 요청 레벨 캐싱을 적용하며, Display Count/Quotas/Drop-off/Meta/Summary를 병렬 처리한다. |

#### 4.6.2 선행 조건 (Preconditions)

- 유효한 설문 ID가 존재해야 한다.
- 사용자가 해당 설문에 대한 조회 권한을 보유해야 한다.

#### 4.6.3 후행 조건 (Postconditions)

- 전체 응답 데이터가 메모리에 로딩된다.
- Display Count, Quotas 정보가 조회된다.
- 메타 통계, 질문별 Summary, Drop-off 분석 데이터가 계산 완료된다.

#### 4.6.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | 요청 레벨 캐시를 확인한다. 캐시가 유효하면 캐시된 데이터를 반환한다. |
| 2 | 시스템 | Cursor 기반 페이지네이션으로 응답 데이터를 로딩한다. 배치 크기: 5,000건. |
| 3 | 시스템 | 더 이상 데이터가 없을 때까지 반복하여 전체 응답을 로딩한다. |
| 4 | 시스템 | 병렬로 다음을 조회한다: Display Count, Quotas 정보. |
| 5 | 시스템 | 병렬로 다음을 계산한다: Drop-off 분석, Meta 통계 + Element Summary. |
| 6 | 시스템 | 결과를 요청 레벨 캐시에 저장한다. |
| 7 | 시스템 | 계산된 데이터를 각 UI 컴포넌트에 전달한다. |

#### 4.6.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-06-01 | 필터가 적용된 경우 | 필터 조건을 포함한 쿼리로 응답 데이터를 로딩한다. 필터링된 응답만 로딩한다. |
| AF-06-02 | 캐시가 유효한 경우 | 데이터베이스 조회를 건너뛰고 캐시된 데이터를 반환한다. |

#### 4.6.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-06-01 | 데이터 로딩 중 오류 발생 | 에러를 로깅하고, 사용자에게 재시도 가능한 에러 메시지를 표시한다. |

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-06-01 | Cursor 기반 페이지네이션을 사용한다 (skip/offset 방식 사용 금지). |
| BR-06-02 | 배치 크기는 5,000건으로 고정한다. |
| BR-06-03 | Display Count와 Quotas 조회는 반드시 병렬로 실행한다. |
| BR-06-04 | Drop-off 분석과 Meta/Summary 계산은 반드시 병렬로 실행한다. |

#### 4.6.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| surveyId | string | 필수 | 유효한 설문 ID |
| filterConditions | object | 선택 | 필터 조건 객체 |
| cursor | string | 선택 | 페이지네이션 커서 |
| batchSize | integer | 내부 | 5,000 고정 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| responses | array | 전체 응답 데이터 배열 |
| displayCount | integer | 총 노출 수 |
| quotas | array | 쿼터 정보 배열 |
| metaStats | object | 메타 통계 계산 결과 |
| dropoffAnalysis | array | 질문별 Drop-off 분석 결과 |
| questionSummaries | array | 질문별 Summary 계산 결과 |

#### 4.6.9 화면/UI 요구사항

- 데이터 로딩 중 로딩 인디케이터(스피너 또는 스켈레톤)를 표시한다.

#### 4.6.10 비기능 요구사항

- 요청 레벨 캐싱을 적용하여 동일 요청에 대한 중복 계산을 방지한다.
- 병렬 처리로 전체 로딩 시간을 최소화한다.

---

### 4.7 Summary 필터 적용

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-07 |
| 기능명 | Summary 필터 적용 |
| 관련 요구사항 ID | FR-037, AC-037-05 |
| 우선순위 | 중간 |
| 기능 설명 | Summary 페이지에서 필터를 적용하면 필터링된 응답만을 기반으로 모든 통계(메타 통계, NPS, CSAT, Drop-off 등)를 재계산하여 표시한다. |

#### 4.7.2 선행 조건 (Preconditions)

- Summary 페이지가 로딩된 상태이어야 한다.
- 필터 조건이 1개 이상 설정되어야 한다.

#### 4.7.3 후행 조건 (Postconditions)

- 필터 조건에 맞는 응답만으로 모든 Summary 통계가 재계산되어 표시된다.
- Display Count가 필터에 맞게 조정된다.

#### 4.7.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | Summary 페이지에서 필터 조건을 설정한다. |
| 2 | 시스템 | 필터 조건에 맞는 응답 데이터만을 대상으로 Summary 데이터 로딩(FN-025-06)을 재실행한다. |
| 3 | 시스템 | 메타 통계(FN-025-01), NPS(FN-025-02), CSAT(FN-025-03), Drop-off(FN-025-04), 질문별 Summary(FN-025-05)를 모두 재계산한다. |
| 4 | 시스템 | 재계산된 결과로 UI를 갱신한다. |
| 5 | 사용자 | 필터가 적용된 Summary 결과를 확인한다. |

#### 4.7.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-07-01 | 사용자가 필터를 해제한 경우 | 전체 응답 기반으로 Summary를 재계산한다. |

#### 4.7.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-07-01 | 필터 조건에 맞는 응답이 0건인 경우 | 모든 통계를 0 또는 빈 상태로 표시한다. |

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-07-01 | 필터 적용 시 Display Count도 필터에 맞게 조정되어야 한다. |
| BR-07-02 | 필터 적용 상태는 내보내기(FN-025-08, FN-025-09)에도 반영된다. |

#### 4.7.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| filterConditions | object | 필수 | 1개 이상의 유효한 필터 조건 |

**출력 데이터:** FN-025-06의 출력 데이터와 동일 (필터 적용된 버전).

#### 4.7.9 화면/UI 요구사항

- 필터 적용 중 로딩 인디케이터를 표시한다.
- 현재 적용된 필터 조건을 시각적으로 표시한다 (필터 태그 등).

#### 4.7.10 비기능 요구사항

- 해당 없음 (일반 성능 요구사항에 포함).

---

### 4.8 CSV 내보내기

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-08 |
| 기능명 | CSV 내보내기 |
| 관련 요구사항 ID | FR-038, AC-038-01, AC-038-03 |
| 우선순위 | 높음 |
| 기능 설명 | 설문 응답 데이터를 CSV 형식으로 변환하여 파일로 다운로드한다. UTF-8 인코딩을 사용하며, 현재 적용된 필터 조건이 내보내기에도 반영된다. |

#### 4.8.2 선행 조건 (Preconditions)

- 사용자가 Organization owner/manager이거나, Project Team read 이상의 권한을 보유해야 한다.
- 설문에 응답 데이터가 1건 이상 존재해야 한다.

#### 4.8.3 후행 조건 (Postconditions)

- CSV 파일이 브라우저를 통해 사용자의 로컬 장치에 다운로드된다.
- 다운로드에 사용된 Object URL이 해제된다.

#### 4.8.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | Summary 페이지에서 내보내기 버튼을 클릭하고 CSV 형식을 선택한다. |
| 2 | 시스템 | 사용자의 권한을 확인한다 (owner/manager 또는 project read 이상). |
| 3 | 시스템 | 설문 정보를 조회한다. |
| 4 | 시스템 | Cursor 기반 페이지네이션으로 전체 응답을 로딩한다 (배치 크기: 3,000건). |
| 5 | 시스템 | 설문 상세 정보를 추출한다: 메타데이터 필드, 질문 제목, 히든 필드, 변수, 사용자 속성. |
| 6 | 시스템 | Storage URL을 절대 경로로 변환한다. |
| 7 | 시스템 | 내보내기 헤더를 구성한다 (고정 헤더 + 동적 헤더): |
|   |        | **고정 헤더**: No., Response ID, Timestamp, Finished, Survey ID, Inquiry ID, User ID, Notes, Tags |
|   |        | **조건부 헤더**: Quotas (유료 기능 허용 시), Verified Email (이메일 인증 활성화 시) |
|   |        | **동적 헤더**: 메타데이터 필드, 질문 제목, 변수 이름, 히든 필드 ID, 사용자 속성 키 |
| 8 | 시스템 | JSON 데이터를 생성한다. |
| 9 | 시스템 | JSON 데이터를 CSV 형식(text/csv;charset=utf-8)으로 변환한다. |
| 10 | 시스템 | 파일 이름을 생성한다: export-{survey-name}-{YYYY-MM-DD-HH-mm-ss}.csv (소문자). |
| 11 | 시스템 | 브라우저에서 Blob 객체를 생성하고 Object URL을 통해 다운로드를 트리거한다. |
| 12 | 시스템 | 다운로드 완료 후 Object URL을 즉시 해제한다 (메모리 누수 방지). |
| 13 | 사용자 | CSV 파일이 로컬에 다운로드됨을 확인한다. |

#### 4.8.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-08-01 | 필터가 적용된 상태에서 내보내기를 실행한 경우 | 필터 조건에 맞는 응답만 내보내기에 포함한다. |

#### 4.8.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-08-01 | 사용자 권한이 부족한 경우 | 내보내기 기능을 비활성화하거나, 권한 부족 알림을 표시한다. |
| EF-08-02 | 서버 측에서 내보내기를 호출한 경우 | 에러를 반환한다 (브라우저에서만 동작). |
| EF-08-03 | 내보내기 대상 응답이 0건인 경우 | 빈 데이터에 대한 안내 메시지를 표시하거나, 헤더만 포함된 파일을 생성한다. |

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-08-01 | 내보내기 권한: Organization owner/manager 또는 Project Team read 이상이어야 한다. |
| BR-08-02 | CSV 인코딩은 UTF-8을 사용한다 (MIME Type: text/csv;charset=utf-8). |
| BR-08-03 | 파일 이름 형식: export-{survey-name}-{YYYY-MM-DD-HH-mm-ss}.csv (전체 소문자). |
| BR-08-04 | 내보내기 배치 크기는 3,000건으로 고정한다. |
| BR-08-05 | Storage URL은 절대 경로로 변환하여 내보내기에 포함한다. |
| BR-08-06 | 다운로드 후 Object URL을 즉시 해제해야 한다. |

#### 4.8.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| surveyId | string | 필수 | 유효한 설문 ID |
| format | string | 필수 | "csv" |
| filterConditions | object | 선택 | 필터 조건 객체 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| fileContent | string | UTF-8 인코딩된 CSV 텍스트 |
| fileName | string | export-{name}-{date}.csv |
| mimeType | string | text/csv;charset=utf-8 |

#### 4.8.9 화면/UI 요구사항

- 내보내기 버튼에 CSV/XLSX 형식 선택 드롭다운을 제공한다.
- 내보내기 진행 중 로딩 상태를 표시한다.

#### 4.8.10 비기능 요구사항

- Cursor 기반 페이지네이션(배치 3,000건)으로 대량 데이터 내보내기 시 메모리 사용을 제어한다.
- 한글 등 다국어 문자가 깨지지 않도록 UTF-8 인코딩을 보장한다.

---

### 4.9 XLSX 내보내기

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-09 |
| 기능명 | XLSX 내보내기 |
| 관련 요구사항 ID | FR-038, AC-038-02, AC-038-03 |
| 우선순위 | 높음 |
| 기능 설명 | 설문 응답 데이터를 XLSX 형식으로 변환하여 파일로 다운로드한다. Base64 인코딩에서 바이너리로 변환하는 과정을 거친다. |

#### 4.9.2 선행 조건 (Preconditions)

- 사용자가 Organization owner/manager이거나, Project Team read 이상의 권한을 보유해야 한다.
- 설문에 응답 데이터가 1건 이상 존재해야 한다.

#### 4.9.3 후행 조건 (Postconditions)

- XLSX 파일이 브라우저를 통해 사용자의 로컬 장치에 다운로드된다.
- 다운로드에 사용된 Object URL이 해제된다.

#### 4.9.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | Summary 페이지에서 내보내기 버튼을 클릭하고 XLSX 형식을 선택한다. |
| 2 | 시스템 | 사용자의 권한을 확인한다 (owner/manager 또는 project read 이상). |
| 3 | 시스템 | 설문 정보를 조회한다. |
| 4 | 시스템 | Cursor 기반 페이지네이션으로 전체 응답을 로딩한다 (배치 크기: 3,000건). |
| 5 | 시스템 | 설문 상세 정보를 추출한다: 메타데이터 필드, 질문 제목, 히든 필드, 변수, 사용자 속성. |
| 6 | 시스템 | Storage URL을 절대 경로로 변환한다. |
| 7 | 시스템 | 내보내기 헤더를 구성한다 (FN-025-08의 4.8.4 단계 7과 동일). |
| 8 | 시스템 | JSON 데이터를 생성한다. |
| 9 | 시스템 | JSON 데이터를 XLSX 형식으로 변환한다 (MIME Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet). |
| 10 | 시스템 | 파일 이름을 생성한다: export-{survey-name}-{YYYY-MM-DD-HH-mm-ss}.xlsx (소문자). |
| 11 | 시스템 | Base64 인코딩된 문자열을 바이너리로 디코딩하여 Blob 객체를 생성한다. |
| 12 | 시스템 | Object URL을 통해 다운로드를 트리거한다. |
| 13 | 시스템 | 다운로드 완료 후 Object URL을 즉시 해제한다 (메모리 누수 방지). |
| 14 | 사용자 | XLSX 파일이 로컬에 다운로드됨을 확인한다. |

#### 4.9.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-09-01 | 필터가 적용된 상태에서 내보내기를 실행한 경우 | 필터 조건에 맞는 응답만 내보내기에 포함한다. |

#### 4.9.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-09-01 | 사용자 권한이 부족한 경우 | 내보내기 기능을 비활성화하거나, 권한 부족 알림을 표시한다. |
| EF-09-02 | 서버 측에서 내보내기를 호출한 경우 | 에러를 반환한다 (브라우저에서만 동작). |
| EF-09-03 | Base64 디코딩 실패 | 에러를 로깅하고 사용자에게 다운로드 실패 알림을 표시한다. |

#### 4.9.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-09-01 | 내보내기 권한: Organization owner/manager 또는 Project Team read 이상이어야 한다. |
| BR-09-02 | XLSX MIME Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| BR-09-03 | 파일 이름 형식: export-{survey-name}-{YYYY-MM-DD-HH-mm-ss}.xlsx (전체 소문자). |
| BR-09-04 | Base64 인코딩된 문자열을 바이너리로 정확하게 디코딩해야 한다. |
| BR-09-05 | 다운로드 후 Object URL을 즉시 해제해야 한다. |

#### 4.9.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| surveyId | string | 필수 | 유효한 설문 ID |
| format | string | 필수 | "xlsx" |
| filterConditions | object | 선택 | 필터 조건 객체 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| fileContent | string (Base64) | Base64 인코딩된 XLSX 데이터 |
| fileName | string | export-{name}-{date}.xlsx |
| mimeType | string | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |

#### 4.9.9 화면/UI 요구사항

- FN-025-08과 동일 (내보내기 버튼의 형식 선택 드롭다운).

#### 4.9.10 비기능 요구사항

- Base64 -> 바이너리 변환 과정에서 데이터 무결성을 보장한다.
- 메모리 관리를 위해 Object URL을 즉시 해제한다.

---

### 4.10 선택된 행 내보내기

#### 4.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-10 |
| 기능명 | 선택된 행 내보내기 |
| 관련 요구사항 ID | FR-038, AC-038-04 |
| 우선순위 | 중간 |
| 기능 설명 | 응답 테이블에서 사용자가 선택한 특정 행(응답)만을 CSV 또는 XLSX 형식으로 내보낸다. |

#### 4.10.2 선행 조건 (Preconditions)

- 사용자가 Organization owner/manager이거나, Project Team read 이상의 권한을 보유해야 한다.
- 응답 테이블에서 1개 이상의 행이 선택되어 있어야 한다.

#### 4.10.3 후행 조건 (Postconditions)

- 선택된 행만 포함된 CSV 또는 XLSX 파일이 다운로드된다.

#### 4.10.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 응답 테이블에서 내보낼 행(응답)을 1개 이상 선택한다 (체크박스 등). |
| 2 | 사용자 | 드롭다운 메뉴에서 내보내기 형식(CSV 또는 XLSX)을 선택한다. |
| 3 | 시스템 | 로딩 상태를 표시한다. |
| 4 | 시스템 | 선택된 행에 해당하는 응답 데이터만 추출한다. |
| 5 | 시스템 | 내보내기 헤더를 구성한다 (FN-025-08의 4.8.4 단계 7과 동일). |
| 6 | 시스템 | 선택된 형식(CSV 또는 XLSX)으로 데이터를 변환한다. |
| 7 | 시스템 | 파일을 다운로드하고 Object URL을 해제한다. |
| 8 | 시스템 | 로딩 상태를 해제한다. |
| 9 | 사용자 | 파일이 다운로드됨을 확인한다. |

#### 4.10.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.10.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-10-01 | 선택된 행이 0건인 경우 | 내보내기 옵션을 비활성화하거나, 선택 필요 안내 메시지를 표시한다. |
| EF-10-02 | 사용자 권한이 부족한 경우 | 내보내기 기능을 비활성화하거나, 권한 부족 알림을 표시한다. |

#### 4.10.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-10-01 | 선택된 행만 내보내기에 포함한다 (전체 응답이 아님). |
| BR-10-02 | 내보내기 헤더 구조는 전체 내보내기(FN-025-08, FN-025-09)와 동일하다. |
| BR-10-03 | 다운로드 중 로딩 상태가 표시되어야 한다. |

#### 4.10.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| selectedResponseIds | string[] | 필수 | 1개 이상의 유효한 응답 ID |
| format | string | 필수 | "csv" 또는 "xlsx" |

**출력 데이터:** FN-025-08 또는 FN-025-09의 출력 데이터와 동일 (선택된 행만 포함).

#### 4.10.9 화면/UI 요구사항

- 테이블의 각 행에 체크박스를 제공한다.
- 1개 이상 행이 선택되면 드롭다운 메뉴에 CSV/XLSX 내보내기 옵션을 표시한다.
- 다운로드 진행 중 로딩 인디케이터를 표시한다.

#### 4.10.10 비기능 요구사항

- 해당 없음 (일반 성능 요구사항에 포함).

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

| 엔티티 | 설명 | 주요 속성 |
|--------|------|----------|
| Survey | 설문 | id, name, questions, hiddenFields, variables, welcomeCardEnabled, quotas |
| Response | 설문 응답 | id, surveyId, data(질문별 응답), meta(메타데이터), ttc(소요시간), finished, createdAt, notes, tags, contactAttributes |
| Display | 설문 노출 | id, surveyId, contactId, createdAt |
| Quota | 설문 쿼터 | id, surveyId, limit, currentCount |
| Question | 질문 | id, type, headline, choices(선택지), range(Rating), logic(조건분기) |

### 5.2 엔티티 간 관계

```
Survey (1) ──── (*) Question
Survey (1) ──── (*) Response
Survey (1) ──── (*) Display
Survey (1) ──── (*) Quota
Response (*) ──── (1) Survey
Response (*) ──── (0..1) Contact
```

### 5.3 데이터 흐름

```
[Summary 요청]
    │
    ▼
[응답 데이터 로딩] ──▶ Cursor 페이지네이션 (5,000건/배치)
    │                     └── Response 테이블
    │
    ├──▶ [Display Count 조회] ── Display 테이블
    │
    ├──▶ [Quotas 조회] ── Quota 테이블
    │
    ├──▶ [메타 통계 계산]
    │
    ├──▶ [Drop-off 분석] ── Survey.questions + Response.data
    │
    └──▶ [질문별 Summary] ── Question.type별 분기

[내보내기 요청]
    │
    ▼
[응답 데이터 로딩] ──▶ Cursor 페이지네이션 (3,000건/배치)
    │                     └── Response 테이블 + Contact 속성
    │
    ├──▶ [헤더 구성] ── Survey 메타정보
    │
    ├──▶ [데이터 변환] ── JSON → CSV/XLSX
    │
    └──▶ [파일 다운로드] ── Blob → Object URL → 다운로드
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 연동 대상 | 연동 방식 | 설명 |
|----------|----------|------|
| 브라우저 File API | Blob/Object URL | CSV/XLSX 파일 다운로드에 사용 |
| Storage 서비스 | URL 변환 | 내보내기 시 Storage URL을 절대 경로로 변환 |

### 6.2 API 명세

#### 6.2.1 Summary 데이터 조회 API

| 항목 | 내용 |
|------|------|
| 엔드포인트 | 서버 액션 또는 내부 API |
| 메서드 | 서버 액션 호출 |
| 요청 파라미터 | surveyId (필수), filterConditions (선택) |
| 응답 | metaStats, dropoffAnalysis, questionSummaries, displayCount, quotas |
| 캐싱 | 요청 레벨 캐싱 적용 |

#### 6.2.2 내보내기 API

| 항목 | 내용 |
|------|------|
| 엔드포인트 | 서버 액션 또는 내부 API |
| 메서드 | 서버 액션 호출 |
| 요청 파라미터 | surveyId (필수), format ("csv" 또는 "xlsx"), filterConditions (선택) |
| 응답 | fileContent (CSV 텍스트 또는 Base64 문자열), fileName, mimeType |
| 권한 | Organization owner/manager 또는 Project Team read 이상 |

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| 항목 | 요구사항 |
|------|---------|
| Summary 데이터 로딩 | Cursor 기반 페이지네이션 사용, 배치 크기 5,000건 |
| 내보내기 데이터 로딩 | Cursor 기반 페이지네이션 사용, 배치 크기 3,000건 |
| 병렬 조회 | Display Count와 Quotas를 병렬로 조회 |
| 병렬 계산 | Meta 계산과 Element Summary를 병렬로 실행 |
| 병렬 계산 | Drop-off 분석과 Meta/Summary를 병렬로 계산 |

### 7.2 보안 요구사항

| 항목 | 요구사항 |
|------|---------|
| 접근 제어 | 내보내기는 Organization owner/manager 또는 Project Team read 이상 권한을 보유한 사용자만 실행 가능 |
| 데이터 무결성 | Storage URL을 절대 경로로 변환하여 내보내기 데이터의 무결성 보장 |

### 7.3 가용성 요구사항

| 항목 | 요구사항 |
|------|---------|
| 캐싱 | 요청 레벨 Summary 데이터 캐싱으로 중복 요청 방지 |
| 메모리 관리 | 다운로드 후 Object URL 즉시 해제하여 메모리 누수 방지 |
| 클라이언트 제약 | 파일 다운로드는 브라우저 환경에서만 동작 (서버 측 호출 시 에러 반환) |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 내용 |
|------|------|
| 브라우저 전용 | 파일 다운로드(CSV/XLSX)는 브라우저 환경에서만 동작한다. 서버 측에서 호출 시 에러가 발생한다. |
| Cursor 페이지네이션 | skip/offset 방식이 아닌 Cursor 기반 페이지네이션만 사용한다. |
| 샘플 제한 | 질문 유형별 Summary 샘플 데이터는 최대 50건으로 제한한다. |
| 소수점 정밀도 | 모든 비율 및 평균 계산은 소수점 2자리까지 표시한다. |

### 8.2 비즈니스 제약사항

| 항목 | 내용 |
|------|------|
| 라이선스 | Community 라이선스로 제공된다. |
| Quotas | 쿼터 관련 기능(Quotas Completed 표시, Quotas 열 내보내기)은 유료 기능 허용 시에만 제공된다. |
| 이메일 인증 | Verified Email 열은 이메일 인증 기능이 활성화된 경우에만 내보내기에 포함된다. |
| 내보내기 권한 | Organization owner/manager 또는 Project Team read 이상 권한이 필요하다. |

### 8.3 가정사항

| 항목 | 내용 |
|------|------|
| 데이터 완결성 | 응답 데이터의 ttc, data, meta 필드가 정상적으로 저장되어 있다고 가정한다. |
| 설문 구조 | 설문의 질문 구조 및 조건 분기 로직이 올바르게 정의되어 있다고 가정한다. |
| 브라우저 호환성 | Blob API와 Object URL을 지원하는 모던 브라우저를 사용한다고 가정한다. |
| NPS 점수 범위 | NPS 질문은 항상 0~10 범위의 정수 값을 반환한다고 가정한다. |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 수용 기준 ID | 기능 ID | 기능명 | 상태 |
|------------|-------------|---------|--------|------|
| FR-037 | AC-037-01 | FN-025-01 | Summary 메타 통계 | 정의 완료 |
| FR-037 | AC-037-02 | FN-025-02 | NPS 스코어 계산 및 시각화 | 정의 완료 |
| FR-037 | AC-037-03 | FN-025-03 | CSAT 만족도 계산 | 정의 완료 |
| FR-037 | AC-037-04 | FN-025-04 | Drop-off 분석 | 정의 완료 |
| FR-037 | - | FN-025-05 | 질문 유형별 Summary 컴포넌트 | 정의 완료 |
| FR-037 | - | FN-025-06 | Summary 데이터 로딩 | 정의 완료 |
| FR-037 | AC-037-05 | FN-025-07 | Summary 필터 적용 | 정의 완료 |
| FR-038 | AC-038-01, AC-038-03 | FN-025-08 | CSV 내보내기 | 정의 완료 |
| FR-038 | AC-038-02, AC-038-03 | FN-025-09 | XLSX 내보내기 | 정의 완료 |
| FR-038 | AC-038-04 | FN-025-10 | 선택된 행 내보내기 | 정의 완료 |

### 9.2 정책/제약 요약

| 항목 | 값 |
|------|-----|
| NPS Promoter 점수 | 9 - 10 |
| NPS Passive 점수 | 7 - 8 |
| NPS Detractor 점수 | 0 - 6 |
| NPS 스코어 범위 | -100 ~ +100 |
| CSAT Range 3 만족 | 3 |
| CSAT Range 4 만족 | 3, 4 |
| CSAT Range 5 만족 | 4, 5 |
| CSAT Range 6 만족 | 5, 6 |
| CSAT Range 7 만족 | 6, 7 |
| CSAT Range 10 만족 | 8, 9, 10 |
| Summary 샘플 제한 | 50건 |
| Summary 배치 크기 | 5,000건 |
| 내보내기 배치 크기 | 3,000건 |
| 내보내기 형식 | CSV, XLSX |
| 파일 이름 형식 | export-{name}-{date}.{ext} (소문자) |
| 내보내기 권한 | owner/manager 또는 project read 이상 |
| 소수점 정밀도 | 2자리 |
| Drop-off TTC 표시 | 초 단위, 소수점 2자리 |
| 내보내기 고정 헤더 수 | 10개 (+ 선택적 Quotas, Verified Email) |

### 9.3 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-02-21 | 최초 작성 | - |
