# 분석, 요약 및 내보내기 -- 요구사항 명세서

> **문서번호**: FSD-025 | **FR 범위**: FR-037 ~ FR-038
> **라이선스**: Community

---

## 1. 목적/배경

설문 응답 데이터에 대한 통합 분석 기능을 제공한다. Summary 페이지에서는 질문별 응답 집계, NPS/CSAT 스코어 계산, Drop-off 분석, 완료율 등의 메타 통계를 시각적으로 표시한다. 또한 응답 데이터를 CSV 또는 XLSX 형식으로 내보내기(Export)하여 외부 도구에서 추가 분석할 수 있다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- Summary 메타 통계 (Impressions, Starts, Completed, Drop-offs, TTC)
- 질문 유형별 Summary 컴포넌트 (NPS, Rating, Multiple Choice 등)
- NPS 스코어 계산 (Promoter/Passive/Detractor)
- CSAT 만족도 계산 (Range별)
- Drop-off 분석 (질문별 이탈률)
- 완료율(Completion Rate) 계산
- CSV/XLSX 내보내기
- 필터 적용 내보내기
- 히든 필드, 변수, 메타데이터 포함 내보내기

### Out-of-scope
- AI 기반 응답 분석 (별도 모듈)
- 실시간 대시보드 / 차트 위젯
- 응답 카드/테이블 뷰 (FSD-021 참조)

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Survey Analyst | Summary 페이지에서 분석 확인 |
| Data Exporter | 응답 데이터 CSV/XLSX 내보내기 |
| Project Owner/Manager | 설문 성과 모니터링 |

---

## 4. 기능 요구사항

### FR-037: 분석 및 요약

#### 4.1 Summary 메타 통계

Summary 메타 통계 계산 방식:

| 통계 항목 | 계산 방식 |
|-----------|----------|
| 시작률(startsPercentage) | (총 응답 수 / 노출 수) * 100 |
| 완료율(completedPercentage) | (완료 응답 수 / 노출 수) * 100 |
| 이탈 수(dropOffCount) | 총 응답 수 - 완료 응답 수 |
| 이탈률(dropOffPercentage) | (이탈 수 / 총 응답 수) * 100 |
| TTC 평균 | 전체 소요 시간(_total)이 있는 응답들의 평균 |
| 쿼터 완료율 | (완료된 쿼터 수 / 전체 쿼터 수) * 100 |

- 노출 수가 0이면 비율은 모두 0%로 처리

UI에 표시되는 메타 통계:

| 통계 | 설명 | 표시 형식 |
|------|------|----------|
| Impressions | 설문 노출 수 | 숫자 |
| Starts | 응답 시작 수 | 숫자 + 시작률% |
| Completed | 완료된 응답 수 | 숫자 + 완료율% |
| Drop-offs | 이탈 수 (클릭 가능, 상세 보기) | 숫자 + 이탈률% |
| Time to Complete | 평균 소요 시간 | "Xm Xs" 또는 "Xs" 형식 |
| Quotas Completed | 쿼터 완료 수 (유료 기능, 쿼터 존재 시만) | 숫자 + 완료율% |

시간 형식 변환:
- 60초 이상이면 "Xm Xs" (분+초) 형식으로 표시
- 60초 미만이면 "Xs" (초) 형식으로 표시
- 소수점 2자리까지 표시

#### 4.2 NPS (Net Promoter Score) 계산

NPS는 0~10 점수를 기반으로 다음과 같이 분류하여 계산한다:

**NPS 분류 기준:**

| 그룹 | 점수 범위 | 의미 |
|------|----------|------|
| Promoters | 9 - 10 | 추천 의향 높음 |
| Passives | 7 - 8 | 중립 |
| Detractors | 0 - 6 | 비추천 의향 |
| Dismissed | TTC > 0, 응답 없음 | 질문 스킵 |

**NPS 스코어**: (Promoters% - Detractors%) 범위: -100 ~ +100

0~10 개별 점수별 카운트도 집계된다.

NPS Summary UI:
- **Aggregated 뷰**: Promoters/Passives/Detractors/Dismissed 각각 비율 + Progress Bar
- **Individual 뷰**: 0~10 개별 점수 막대 그래프 (11개 바)
- **HalfCircle 게이지**: NPS 스코어를 반원 차트로 시각화
- **필터 적용**: 각 그룹/점수 클릭 시 해당 응답 필터 적용

NPS 투명도 계산:
- 0~6점(Detractor): 0.3 ~ 0.6 범위
- 7~8점(Passive): 0.6 ~ 0.8 범위
- 9~10점(Promoter): 0.8 ~ 1.0 범위

#### 4.3 CSAT (Customer Satisfaction) 계산

Rating 질문 유형의 Summary에서 CSAT를 계산한다.

**CSAT "만족" 기준 (Range별):**

| Range | "만족" 점수 | 설명 |
|-------|-----------|------|
| 3 | 3 | 최고점만 |
| 4 | 3, 4 | 상위 2점 |
| 5 | 4, 5 | 상위 2점 |
| 6 | 5, 6 | 상위 2점 |
| 7 | 6, 7 | 상위 2점 |
| 10 | 8, 9, 10 | 상위 3점 |

CSAT% = (Satisfied Count / Total Response Count) * 100

Rating Summary에는 평균 점수, 응답 수, 점수별 분포, 스킵 수, CSAT(만족 수 및 만족 비율)가 포함된다.

#### 4.4 Drop-off 분석

Drop-off 분석 핵심 로직:
1. 각 응답에 대해 설문 로직(조건 분기)을 시뮬레이션하여 질문 경로 추적
2. 각 질문의 Impressions(노출 수)와 Drop-off Count(이탈 수) 집계
3. Welcome Card가 비활성화된 경우 첫 번째 질문의 Impressions를 displayCount로 대체
4. 질문별 평균 TTC 계산

Drop-off UI 표시 열:

| 열 | 내용 |
|----|------|
| Questions | 질문 아이콘 + 제목 |
| TTC | 평균 소요 시간 (초, N/A) |
| Impressions | 노출 수 |
| Drop-offs | 이탈 수 + 이탈 비율(%) |

#### 4.5 질문 유형별 Summary 컴포넌트

| 질문 유형 | 주요 분석 내용 |
|-----------|--------------|
| OpenText | 텍스트 응답 샘플 (최대 50건) |
| MultipleChoice (Single/Multi) | 선택지별 카운트/비율 |
| PictureSelection | 이미지별 선택 카운트/비율 |
| Rating | 평균 점수, CSAT, 점수별 분포 |
| NPS | NPS 스코어, Promoter/Passive/Detractor |
| CTA | CTR (Click-Through Rate) |
| Consent | 수락/스킵 비율 |
| Date | 날짜 응답 샘플 |
| FileUpload | 파일 목록 |
| Cal | 예약/스킵 비율 |
| Matrix | 행-열 교차 백분율 |
| Address | 주소 응답 샘플 |
| ContactInfo | 연락처 응답 샘플 |
| Ranking | 선택지별 평균 순위 |
| HiddenFields | 히든 필드 값 샘플 |

**샘플 데이터 제한**: 각 질문 유형별 최대 50건의 샘플

#### 4.6 Summary 데이터 로딩

Summary 데이터 로딩 방식:
- 요청 레벨 캐싱 적용
- Cursor 기반 페이지네이션으로 전체 응답 로딩 (skip/offset 대신)
- 배치 크기: 5,000건
- Display Count와 Quotas를 병렬 조회
- Drop-off와 Meta/Summary를 병렬 계산
- 필터 적용 시 필터링된 응답만 로딩

### FR-038: 내보내기 (Export)

#### 4.7 내보내기 형식

2가지 형식 지원:

| 형식 | MIME Type |
|------|----------|
| CSV | text/csv;charset=utf-8 |
| XLSX | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |

#### 4.8 내보내기 헤더 구성

내보내기 파일의 헤더(열)는 다음으로 구성된다:

| 헤더 | 설명 |
|------|------|
| No. | 순번 |
| Response ID | 응답 ID |
| Timestamp | 생성 시간 |
| Finished | 완료 여부 |
| Quotas | 쿼터 (유료 기능 허용 시만 포함) |
| Survey ID | 설문 ID |
| Formbricks ID (internal) | 내부 연락처 ID |
| User ID | 사용자 ID |
| Notes | 노트 |
| Tags | 태그 |
| 메타데이터 필드 (동적) | source, url, browser 등 |
| 질문 제목 (동적) | 각 질문의 제목 |
| 변수 이름 (동적) | 설문 변수 |
| 히든 필드 ID (동적) | 히든 필드 |
| 사용자 속성 키 (동적) | 연락처 속성 |
| Verified Email | 인증된 이메일 (이메일 인증 활성화 시만 포함) |

#### 4.9 내보내기 데이터 생성

내보내기 데이터 생성 과정:
1. 설문 정보 조회
2. Cursor 기반 페이지네이션으로 전체 응답 로딩 (배치 크기: 3,000건)
3. 설문 상세 정보 추출 (메타데이터 필드, 질문 제목, 히든 필드, 변수, 사용자 속성)
4. Storage URL을 절대 경로로 변환
5. JSON 데이터 생성
6. 파일 이름 생성
7. 지정된 형식(CSV 또는 XLSX)으로 변환

#### 4.10 내보내기 트리거 방식

**1. Summary 페이지에서 전체 내보내기**:
- 권한: Organization owner/manager 또는 Project Team read 이상
- 필터 적용: 현재 적용된 필터 조건이 내보내기에도 반영
- CSV 또는 XLSX 형식 선택

**2. 응답 테이블에서 선택된 행 내보내기**:
- 테이블에서 행을 선택한 후 드롭다운 메뉴에서 형식 선택
- CSV 또는 XLSX 형식 중 선택

#### 4.11 파일 다운로드 처리

파일 다운로드 처리 방식:
- XLSX: Base64 인코딩된 문자열을 바이너리로 디코딩하여 파일 생성
- CSV: UTF-8 텍스트 그대로 파일 생성
- 브라우저에서만 동작 (서버 측 호출 시 에러)
- 메모리 누수 방지를 위해 다운로드 후 Object URL 즉시 해제

#### 4.12 파일 이름 형식

형식: export-{survey-name}-{YYYY-MM-DD-HH-mm-ss}.{csv|xlsx} (소문자)

---

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| **성능** | Summary 데이터 로딩에 cursor 기반 페이지네이션 사용 (배치 5,000건) |
| **성능** | 내보내기에 cursor 기반 페이지네이션 사용 (배치 3,000건) |
| **성능** | Display Count와 Quotas 병렬 조회 |
| **성능** | Meta 계산과 Element Summary 병렬 실행 |
| **캐싱** | 요청 레벨 Summary 데이터 캐싱 |
| **접근 제어** | 내보내기는 owner/manager 또는 project read 이상 권한 필요 |
| **데이터 무결성** | Storage URL을 절대 경로로 변환하여 내보내기 |
| **메모리 관리** | 다운로드 후 Object URL 즉시 해제 |

---

## 6. 정책/제약

| 항목 | 값 |
|------|-----|
| NPS Promoter 점수 | 9 - 10 |
| NPS Passive 점수 | 7 - 8 |
| NPS Detractor 점수 | 0 - 6 |
| NPS 스코어 범위 | -100 ~ +100 |
| CSAT Range 3 만족 | 3 |
| CSAT Range 5 만족 | 4, 5 |
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

---

## 7. 수용 기준 (Acceptance Criteria)

### AC-037-01: Summary 메타 통계
- [ ] Impressions(노출 수), Starts(시작 수), Completed(완료 수), Drop-offs(이탈 수), TTC(평균 소요 시간)가 정확히 계산된다
- [ ] 시작률 = (총 응답 수 / 노출 수) * 100으로 계산된다
- [ ] 완료율 = (완료 응답 수 / 노출 수) * 100으로 계산된다
- [ ] 이탈률 = (이탈 수 / 총 응답 수) * 100으로 계산된다
- [ ] TTC 평균은 전체 소요 시간(_total) 필드가 있는 응답들의 평균이다
- [ ] 노출 수가 0이면 비율이 모두 0%로 표시된다

### AC-037-02: NPS 계산
- [ ] 9-10점은 Promoter로 분류된다
- [ ] 7-8점은 Passive로 분류된다
- [ ] 0-6점은 Detractor로 분류된다
- [ ] NPS 스코어 = (Promoter% - Detractor%)로 계산된다
- [ ] TTC가 있지만 응답이 없는 경우 Dismissed로 분류된다
- [ ] 0~10 개별 점수별 막대 그래프가 표시된다
- [ ] HalfCircle 게이지로 NPS 스코어가 시각화된다

### AC-037-03: CSAT 계산
- [ ] Range 5에서 4, 5점이 "만족"으로 계산된다
- [ ] Range 10에서 8, 9, 10점이 "만족"으로 계산된다
- [ ] CSAT% = (만족 수 / 총 응답 수) * 100으로 계산된다
- [ ] Rating의 평균 점수가 소수점 2자리까지 표시된다

### AC-037-04: Drop-off 분석
- [ ] 각 질문별 Impressions(노출), Drop-off Count(이탈), Drop-off %(이탈률)가 표시된다
- [ ] 설문 로직(조건 분기)이 반영되어 질문 경로가 정확히 추적된다
- [ ] Welcome Card 비활성화 시 첫 질문의 Impressions가 displayCount로 대체된다
- [ ] 질문별 평균 TTC가 초 단위로 표시된다

### AC-037-05: 필터 적용
- [ ] 필터를 적용하면 Summary가 필터링된 응답 기반으로 재계산된다
- [ ] 필터 적용 시 Display Count도 필터에 맞게 조정된다

### AC-038-01: CSV 내보내기
- [ ] CSV 파일이 올바른 헤더와 데이터로 생성된다
- [ ] UTF-8 인코딩으로 한글 등이 깨지지 않는다
- [ ] 필터가 적용된 경우 필터링된 응답만 내보내진다
- [ ] 파일 이름이 export-{survey-name}-{date}.csv 형식이다

### AC-038-02: XLSX 내보내기
- [ ] XLSX 파일이 올바른 헤더와 데이터로 생성된다
- [ ] Base64 인코딩에서 바이너리로의 변환이 정확하게 처리된다
- [ ] 파일 이름이 export-{survey-name}-{date}.xlsx 형식이다

### AC-038-03: 내보내기 내용
- [ ] 고정 헤더(No., Response ID, Timestamp, Finished 등)가 포함된다
- [ ] 질문 제목이 헤더로 포함되고 응답 데이터가 매칭된다
- [ ] 메타데이터 필드(source, url, browser 등)가 포함된다
- [ ] 히든 필드 값이 포함된다
- [ ] 변수 이름과 값이 포함된다
- [ ] 사용자 속성이 포함된다
- [ ] 태그가 포함된다
- [ ] Quotas가 허용된 경우 Quotas 열이 포함된다
- [ ] 이메일 인증이 활성화된 경우 Verified Email 열이 포함된다

### AC-038-04: 선택된 행 내보내기
- [ ] 테이블에서 행을 선택하고 CSV/XLSX로 다운로드할 수 있다
- [ ] 선택된 행만 내보내기에 포함된다
- [ ] 다운로드 중 로딩 상태가 표시된다
