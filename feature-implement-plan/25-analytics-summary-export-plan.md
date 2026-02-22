# 기능 구현 계획: 분석, 요약 및 내보내기 (FS-025)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 우선순위 | 설명 |
|---------|--------|---------|------|
| FN-025-01 | Summary 메타 통계 | 높음 | Impressions, Starts, Completed, Drop-offs, TTC, Quotas Completed 6개 메타 통계를 계산하여 페이지 상단에 표시 |
| FN-025-02 | NPS 스코어 계산 및 시각화 | 높음 | Promoter/Passive/Detractor/Dismissed 분류, NPS 스코어(-100~+100) 계산, HalfCircle 게이지/Aggregated/Individual 뷰 시각화 |
| FN-025-03 | CSAT 만족도 계산 | 높음 | Rating 질문의 Range별 만족 기준에 따라 CSAT% 계산, 평균 점수, 점수별 분포, 스킵 수 표시 |
| FN-025-04 | Drop-off 분석 | 높음 | 질문별 노출 수, 이탈 수, 이탈률, 평균 TTC를 조건 분기 로직 시뮬레이션 포함하여 계산 |
| FN-025-05 | 질문 유형별 Summary 컴포넌트 | 높음 | 14가지 질문 유형에 대해 각각 적합한 Summary 컴포넌트 제공 (OpenText, MultipleChoice, Rating, NPS, CTA, Matrix 등) |
| FN-025-06 | Summary 데이터 로딩 | 높음 | Cursor 기반 페이지네이션(5,000건/배치)으로 전체 응답 로딩, Display Count/Quotas 병렬 조회, 요청 레벨 캐싱 |
| FN-025-07 | Summary 필터 적용 | 중간 | 필터 조건에 맞는 응답만으로 모든 통계를 재계산하여 표시 |
| FN-025-08 | CSV 내보내기 | 높음 | UTF-8 CSV 파일 생성 및 브라우저 다운로드. 고정/조건부/동적 헤더 구성, 3,000건/배치 로딩 |
| FN-025-09 | XLSX 내보내기 | 높음 | Base64->바이너리 변환 XLSX 파일 다운로드. CSV와 동일한 헤더 구조 |
| FN-025-10 | 선택된 행 내보내기 | 중간 | 응답 테이블에서 선택한 특정 행만 CSV/XLSX로 내보내기 |

### 1.2 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 성능 | Summary 데이터: Cursor 기반 페이지네이션(5,000건/배치), 내보내기: 3,000건/배치 |
| 병렬 처리 | Display Count + Quotas 병렬 조회, Meta + Element Summary 병렬 계산, Drop-off + Meta/Summary 병렬 계산 |
| 캐싱 | 요청 레벨 Summary 데이터 캐싱으로 중복 요청 방지 |
| 메모리 관리 | 다운로드 후 Object URL 즉시 해제, Base64->바이너리 변환 시 데이터 무결성 보장 |
| 보안 | 내보내기: Organization owner/manager 또는 Project Team read 이상 권한 필요 |
| 정밀도 | 모든 비율/평균 계산은 소수점 2자리까지 표시 |
| 브라우저 전용 | 파일 다운로드(CSV/XLSX)는 브라우저 환경에서만 동작 |

### 1.3 명세서 내 모호성 및 해석

| 항목 | 모호성 | 해석/결정 |
|------|--------|----------|
| API 방식: "서버 액션 또는 내부 API" | Summary 조회와 내보내기 API의 구체적 구현 방식이 정의되지 않음 | 프로젝트가 NestJS + Next.js 분리 아키텍처이므로, NestJS REST API 엔드포인트로 구현한다. Next.js 서버 액션이 아닌, `apiFetch` 래퍼를 통한 API 호출 방식을 따른다 |
| 내보내기 데이터 생성 위치 | 서버에서 CSV/XLSX 콘텐츠를 생성하여 전송하는지, 클라이언트에서 데이터를 받아 변환하는지 불명확 | **서버에서 JSON 데이터를 생성하고, 클라이언트에서 CSV/XLSX로 변환**한다. 이유: (1) 서버 부담 최소화, (2) 브라우저 Blob API 활용, (3) 명세서의 "Object URL 생성" 흐름과 일치 |
| 내보내기 권한 모델 | "Organization owner/manager 또는 Project Team read 이상"이라 명시하지만, 현재 프로젝트에 Team/Project 권한 모델이 없음 | 현재 구현된 MembershipRole 기반으로 매핑한다. OWNER/ADMIN = owner/manager, MEMBER = project read 이상. Team 모델은 미구현이므로 Membership 역할로 대체 |
| 필터 시스템 | Summary 필터가 FN-025-07으로 정의되었지만, 어떤 필터 UI를 사용하는지 미명시 | FS-021의 ResponseFilterService(22가지 연산자)를 재사용한다. Summary 페이지용 필터 UI는 FS-021의 `response-filter-bar.tsx`를 공유 컴포넌트로 추출하여 사용 |
| 요청 레벨 캐싱 | 캐싱의 구체적 구현 방식(Redis, 인메모리, React Query 등)이 미명시 | NestJS 서버 사이드에서는 `CacheInterceptor` 또는 인메모리 TTL 캐시를 사용하고, 클라이언트에서는 React Query(TanStack Query)의 `staleTime`으로 요청 레벨 캐싱을 구현한다 |
| XLSX 변환 라이브러리 | XLSX 생성에 사용할 라이브러리가 미명시 | `xlsx`(SheetJS Community Edition) 라이브러리를 사용한다. 브라우저에서 동작하며 Base64 인코딩/바이너리 변환을 지원한다 |
| Drop-off 분석의 로직 시뮬레이션 | "설문 로직(조건 분기)을 시뮬레이션하여 실제 질문 경로를 추적"이라 명시. 서버/클라이언트 중 어디서 수행할지 불명확 | 서버에서 수행한다. FS-014에서 `packages/logic-engine`을 공유 패키지로 추출하므로, 서버에서도 조건 분기 평가를 수행할 수 있다 |
| Storage URL 변환 | "Storage URL을 절대 경로로 변환"의 구체적 Storage 서비스가 미명시 | 현재 프로젝트에 Storage 서비스가 미구현이므로, 파일 URL이 상대 경로인 경우 서버 base URL을 접두사로 붙이는 유틸 함수로 구현한다. 향후 S3/CloudFront 등 도입 시 교체 |
| HalfCircle 게이지 구현 | SVG/Canvas 기반 게이지 차트 라이브러리 미명시 | SVG 기반 커스텀 컴포넌트로 구현한다. 외부 차트 라이브러리 의존을 최소화하기 위해 `<svg>` + CSS로 반원 게이지를 직접 구현한다 |
| NPS 투명도 계산 | 점수 구간별 투명도 범위(0.3~0.6, 0.6~0.8, 0.8~1.0)가 정의되었으나, 같은 구간 내 점수별 비례 계산 공식이 미명시 | 구간 내 선형 보간(linear interpolation)을 적용한다. 예: Detractor 0~6점 => opacity = 0.3 + (score / 6) * 0.3 |

### 1.4 암시적 요구사항

| 항목 | 설명 |
|------|------|
| 서버 라이브러리 생성 | `libs/server/analytics/` NestJS 모듈 (AnalyticsModule, SummaryService, ExportService, AnalyticsController) |
| 클라이언트 라이브러리 생성 | `libs/client/analytics/` (Summary 페이지 컴포넌트, 내보내기 유틸, hooks, 차트 컴포넌트) |
| XLSX 라이브러리 설치 | `xlsx`(SheetJS) 패키지를 클라이언트 의존성으로 추가 |
| TanStack Query 도입 | 요청 레벨 캐싱, 로딩 상태 관리를 위해 `@tanstack/react-query` 도입 검토 (또는 기존 apiFetch + useState 패턴 유지) |
| Summary 페이지 라우트 | `apps/client/src/app/[lng]/surveys/[surveyId]/summary/page.tsx` 라우트 생성 |
| Display 모델 의존 | Summary 메타 통계에서 Display Count를 조회해야 하므로, Display 모델이 필요 (FS-021/024에서 스텁 정의) |
| Response 모델 의존 | 응답 데이터 조회 전제. FS-021의 Response 모델이 선행되어야 함 |
| Quota 모델 의존 | Quotas Completed 표시를 위해 FS-014의 Quota + ResponseQuota 모델 필요 |
| 로직 엔진 공유 | Drop-off 분석의 조건 분기 시뮬레이션에 `packages/logic-engine` 사용 |
| ResponseFilterService 재사용 | Summary 필터에 FS-021의 필터 엔진 재사용 |
| i18n 번역 키 | Summary 페이지, 내보내기 UI의 모든 라벨/메시지 번역 |
| 감사 로그 | 내보내기 실행 시 AuditLogService.log() 기록 |
| 차트 컴포넌트 | NPS HalfCircle 게이지, Rating 분포 바, MultipleChoice 비율 바 등 SVG 기반 커스텀 차트 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
[브라우저] Summary 페이지
    |
    +-- libs/client/analytics/
    |   ├── components/
    |   │   ├── summary-page.tsx                # Summary 페이지 메인 컨테이너
    |   │   ├── meta-stats-bar.tsx              # 6개 메타 통계 수평 배열
    |   │   ├── drop-off-table.tsx              # Drop-off 분석 테이블
    |   │   ├── summary-filter-bar.tsx          # 필터 UI (FS-021 필터 재사용)
    |   │   ├── export-dropdown.tsx             # CSV/XLSX 내보내기 드롭다운
    |   │   ├── question-summary/
    |   │   │   ├── question-summary-renderer.tsx  # 질문 유형별 Summary 디스패처
    |   │   │   ├── nps-summary.tsx             # NPS Aggregated/Individual/HalfCircle
    |   │   │   ├── rating-summary.tsx          # CSAT, 평균 점수, 분포
    |   │   │   ├── multiple-choice-summary.tsx # 선택지별 카운트/비율 바
    |   │   │   ├── open-text-summary.tsx       # 텍스트 응답 샘플 목록
    |   │   │   ├── picture-selection-summary.tsx
    |   │   │   ├── cta-summary.tsx             # CTR 표시
    |   │   │   ├── consent-summary.tsx         # 수락/스킵 비율
    |   │   │   ├── date-summary.tsx            # 날짜 응답 샘플
    |   │   │   ├── file-upload-summary.tsx     # 파일 목록
    |   │   │   ├── cal-summary.tsx             # 예약/스킵 비율
    |   │   │   ├── matrix-summary.tsx          # 교차 테이블 히트맵
    |   │   │   ├── address-summary.tsx         # 주소 응답 샘플
    |   │   │   ├── contact-info-summary.tsx    # 연락처 응답 샘플
    |   │   │   ├── ranking-summary.tsx         # 평균 순위 막대 그래프
    |   │   │   └── hidden-fields-summary.tsx   # 히든 필드 키-값 목록
    |   │   └── charts/
    |   │       ├── half-circle-gauge.tsx       # NPS 반원 게이지 (SVG)
    |   │       ├── progress-bar.tsx            # 비율 바 (Aggregated 뷰)
    |   │       └── bar-chart.tsx               # 수직/수평 막대 그래프
    |   ├── hooks/
    |   │   ├── use-summary-data.ts            # Summary 데이터 로딩 훅
    |   │   └── use-export.ts                  # 내보내기 실행 훅
    |   ├── api/
    |   │   └── analytics-api.ts               # apiFetch 기반 API 클라이언트
    |   ├── utils/
    |   │   ├── meta-stats-calculator.ts        # 메타 통계 계산 순수 함수
    |   │   ├── nps-calculator.ts               # NPS 스코어 계산 순수 함수
    |   │   ├── csat-calculator.ts              # CSAT 계산 순수 함수
    |   │   ├── drop-off-calculator.ts          # Drop-off 분석 순수 함수
    |   │   ├── question-summary-calculator.ts  # 질문 유형별 집계 순수 함수
    |   │   ├── export-csv.ts                   # CSV 생성/다운로드 유틸
    |   │   ├── export-xlsx.ts                  # XLSX 생성/다운로드 유틸
    |   │   ├── export-header-builder.ts        # 내보내기 헤더 구성 유틸
    |   │   └── format-ttc.ts                   # TTC 시간 포맷 유틸
    |   ├── types/
    |   │   └── analytics.types.ts             # Summary/Export 관련 타입 정의
    |   └── schemas/
    |       └── export-schema.ts               # 내보내기 옵션 zod 스키마
    |
    +-- API 요청 (apiFetch)
    |
    v
[NestJS 서버]
    |
    +-- libs/server/analytics/
    |   ├── analytics.module.ts               # NestJS 모듈
    |   ├── analytics.controller.ts           # REST API 컨트롤러
    |   ├── summary.service.ts                # Summary 데이터 조회/집계 서비스
    |   ├── export.service.ts                 # 내보내기 데이터 생성 서비스
    |   ├── drop-off.service.ts               # Drop-off 분석 서비스
    |   ├── dto/
    |   │   ├── summary-query.dto.ts          # Summary 조회 쿼리 DTO
    |   │   └── export-query.dto.ts           # 내보내기 쿼리 DTO
    |   ├── types/
    |   │   └── analytics.types.ts            # 서버 사이드 타입 정의
    |   └── utils/
    |       └── storage-url.util.ts           # Storage URL 절대 경로 변환
    |
    +-- libs/server/response/ (기존, FS-021)
    |   └── response-filter.service.ts        # 필터 엔진 재사용
    |
    +-- packages/logic-engine/ (기존, FS-012/014)
    |   └── evaluator/                        # 조건 분기 시뮬레이션 재사용
    |
    v
[PostgreSQL]
    ├── Response (응답 데이터)
    ├── Survey (설문 구조)
    ├── Display (노출 이력)
    ├── Quota / ResponseQuota (쿼터)
    └── Contact (연락처)
```

### 2.2 데이터 모델

FS-025는 **신규 DB 테이블을 생성하지 않는다**. 기존 모델들을 조회 전용으로 활용한다.

**의존하는 기존 모델:**

| 모델 | 정의 위치 | 사용 목적 |
|------|----------|----------|
| Survey | FS-008 | 설문 구조, 질문 목록, 히든 필드, 변수, welcomeCardEnabled |
| Response | FS-021 | 응답 데이터(data, ttc, finished, meta, notes, tags, createdAt) |
| Display | FS-021/024 | 설문 노출 이력 (displayCount 집계) |
| Quota | FS-014 | 쿼터 정보 (limit, currentCount) |
| ResponseQuota | FS-014 | 응답-쿼터 연결 (screenedIn 카운트) |
| Contact | FS-026 | 연락처 정보, 사용자 속성 |

**주요 조회 패턴:**

```
// Summary 데이터 로딩 - Cursor 기반 페이지네이션
Response.findMany({
  where: { surveyId, ...filterConditions },
  orderBy: { createdAt: 'asc' },
  take: 5000,
  cursor: lastResponseId ? { id: lastResponseId } : undefined,
  skip: lastResponseId ? 1 : 0
})

// Display Count 조회
Display.count({ where: { surveyId } })

// Quota 완료 조회
Quota.findMany({
  where: { surveyId },
  include: { _count: { select: { responseQuotas: { where: { status: 'screenedIn' } } } } }
})

// 내보내기 데이터 로딩 - Cursor 기반 (3,000건/배치)
Response.findMany({
  where: { surveyId, ...filterConditions },
  include: { contact: { include: { attributeValues: { include: { key: true } } } } },
  orderBy: { createdAt: 'asc' },
  take: 3000,
  cursor: ...
})
```

### 2.3 API 설계

#### 2.3.1 Summary 데이터 조회

```
GET /api/surveys/:surveyId/summary
Authorization: Bearer <JWT>

Query Parameters:
  filterConditions?: string (JSON-encoded 필터 조건)

Response 200:
{
  metaStats: {
    impressions: number,
    starts: number,
    startsPercentage: number,
    completed: number,
    completedPercentage: number,
    dropOffCount: number,
    dropOffPercentage: number,
    ttcAverage: string,         // "Xm Xs" 또는 "Xs" 또는 "N/A"
    quotasCompleted?: number,
    quotasCompletedPercentage?: number
  },
  dropoffAnalysis: Array<{
    questionId: string,
    questionTitle: string,
    questionType: string,
    impressions: number,
    dropOffCount: number,
    dropOffPercentage: number,
    avgTtc: string              // 초 단위 또는 "N/A"
  }>,
  questionSummaries: Array<{
    questionId: string,
    questionType: string,
    questionTitle: string,
    data: object                // 질문 유형별 상이한 집계 데이터
  }>
}
```

#### 2.3.2 내보내기 데이터 조회

```
GET /api/surveys/:surveyId/export
Authorization: Bearer <JWT>

Query Parameters:
  format: "csv" | "xlsx"
  filterConditions?: string (JSON-encoded 필터 조건)
  selectedResponseIds?: string (쉼표 구분 응답 ID 목록)

Response 200:
{
  headers: string[],            // 헤더 배열
  rows: Array<Record<string, any>>,  // 데이터 행 배열
  surveyName: string,           // 파일 이름 생성용
  totalCount: number
}
```

**설계 근거:** 내보내기 API는 JSON 데이터를 반환하고, 클라이언트에서 CSV/XLSX 변환을 수행한다. 이유:
1. 서버의 CPU/메모리 부담을 줄인다 (특히 XLSX 바이너리 생성)
2. 브라우저 Blob API를 활용한 다운로드 흐름과 일치한다
3. 내보내기 형식 변환 로직을 클라이언트에 집중시켜 관심사를 분리한다

### 2.4 주요 컴포넌트 설계

#### 2.4.1 서버: SummaryService

```typescript
// libs/server/analytics/src/lib/summary.service.ts

@Injectable()
export class SummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly responseFilterService: ResponseFilterService,
    private readonly dropOffService: DropOffService,
  ) {}

  /**
   * Summary 데이터를 조회하고 집계한다.
   * Cursor 기반 페이지네이션으로 전체 응답을 배치 로딩(5,000건)한 후,
   * Display Count/Quotas를 병렬 조회하고, Meta/Summary/Drop-off를 병렬 계산한다.
   */
  async getSummary(surveyId: string, filterConditions?: FilterCondition[]) {
    // 1. 설문 구조 조회
    const survey = await this.prisma.survey.findUniqueOrThrow({ where: { id: surveyId } });

    // 2. Cursor 기반 전체 응답 로딩 (5,000건 배치)
    const allResponses = await this.loadAllResponses(surveyId, filterConditions);

    // 3. Display Count, Quotas 병렬 조회
    const [displayCount, quotas] = await Promise.all([
      this.getDisplayCount(surveyId, filterConditions),
      this.getQuotas(surveyId),
    ]);

    // 4. Meta 통계 + Element Summary, Drop-off 분석 병렬 계산
    const [metaAndSummaries, dropoffAnalysis] = await Promise.all([
      this.calculateMetaAndSummaries(survey, allResponses, displayCount, quotas),
      this.dropOffService.analyze(survey, allResponses, displayCount),
    ]);

    return {
      metaStats: metaAndSummaries.metaStats,
      questionSummaries: metaAndSummaries.questionSummaries,
      dropoffAnalysis,
    };
  }

  /** Cursor 기반 페이지네이션으로 전체 응답 배치 로딩 */
  private async loadAllResponses(surveyId: string, filters?: FilterCondition[]) {
    const allResponses = [];
    let cursor: string | undefined;
    const BATCH_SIZE = 5000;

    while (true) {
      const whereClause = this.responseFilterService.buildWhereClause(surveyId, filters);
      const batch = await this.prisma.response.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      allResponses.push(...batch);
      if (batch.length < BATCH_SIZE) break;
      cursor = batch[batch.length - 1].id;
    }

    return allResponses;
  }
}
```

#### 2.4.2 서버: ExportService

```typescript
// libs/server/analytics/src/lib/export.service.ts

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 내보내기용 데이터를 조회하고 JSON 형태로 구성한다.
   * 클라이언트에서 CSV/XLSX로 변환할 수 있도록 헤더 + 행 데이터를 반환한다.
   */
  async getExportData(
    surveyId: string,
    options: {
      filterConditions?: FilterCondition[];
      selectedResponseIds?: string[];
    },
  ) {
    const survey = await this.prisma.survey.findUniqueOrThrow({
      where: { id: surveyId },
    });

    // Cursor 기반 배치 로딩 (3,000건) 또는 선택된 행만 조회
    const responses = options.selectedResponseIds
      ? await this.loadSelectedResponses(options.selectedResponseIds)
      : await this.loadAllResponsesForExport(surveyId, options.filterConditions);

    // 헤더 구성 (고정 + 조건부 + 동적)
    const headers = this.buildExportHeaders(survey);

    // 데이터 행 변환 (Storage URL 절대 경로 변환 포함)
    const rows = this.transformResponsesForExport(responses, survey, headers);

    return {
      headers: headers.map(h => h.label),
      rows,
      surveyName: survey.name,
      totalCount: responses.length,
    };
  }
}
```

#### 2.4.3 서버: DropOffService

```typescript
// libs/server/analytics/src/lib/drop-off.service.ts

@Injectable()
export class DropOffService {
  /**
   * 각 응답에 대해 조건 분기 로직을 시뮬레이션하여
   * 응답자가 거친 질문 경로를 추적하고, 질문별 Drop-off를 분석한다.
   * packages/logic-engine의 evaluateConditionGroup()을 사용한다.
   */
  analyze(survey: Survey, responses: Response[], displayCount: number) {
    // 1. 각 응답별로 질문 경로를 시뮬레이션
    // 2. 질문별 impressions, dropOff, avgTtc 집계
    // 3. Welcome Card 비활성화 시 첫 질문 impressions = displayCount
  }
}
```

#### 2.4.4 클라이언트: 순수 함수 계산기

모든 통계 계산 로직은 **순수 함수**로 구현한다. 서버에서 원시 응답 데이터를 받은 후, 클라이언트에서도 필터 변경 시 재계산에 활용할 수 있다.

```typescript
// libs/client/analytics/src/utils/nps-calculator.ts

export interface NpsResult {
  npsScore: number;
  promoterCount: number;
  promoterPercentage: number;
  passiveCount: number;
  passivePercentage: number;
  detractorCount: number;
  detractorPercentage: number;
  dismissedCount: number;
  dismissedPercentage: number;
  individualScores: Record<number, number>;  // 0~10 각 점수별 카운트
}

/**
 * NPS 스코어를 계산한다.
 * Promoter(9-10), Passive(7-8), Detractor(0-6) 분류 후
 * NPS = Promoter% - Detractor% (-100 ~ +100)
 * Dismissed(TTC > 0, 응답 없음)는 계산에서 제외
 */
export function calculateNps(responses: NpsResponse[]): NpsResult { ... }

/**
 * NPS 점수별 투명도를 계산한다.
 * Detractor(0-6): 0.3 ~ 0.6 선형 보간
 * Passive(7-8): 0.6 ~ 0.8 선형 보간
 * Promoter(9-10): 0.8 ~ 1.0 선형 보간
 */
export function calculateNpsOpacity(score: number): number { ... }
```

```typescript
// libs/client/analytics/src/utils/csat-calculator.ts

/** Range별 만족 점수 기준 매핑 */
const CSAT_SATISFACTION_MAP: Record<number, number[]> = {
  3: [3],
  4: [3, 4],
  5: [4, 5],
  6: [5, 6],
  7: [6, 7],
  10: [8, 9, 10],
};

/**
 * CSAT 만족도를 계산한다.
 * CSAT% = (Satisfied Count / Total Response Count) * 100
 */
export function calculateCsat(responses: RatingResponse[], range: number): CsatResult { ... }
```

#### 2.4.5 클라이언트: 내보내기 유틸

```typescript
// libs/client/analytics/src/utils/export-csv.ts

/**
 * JSON 데이터를 CSV 텍스트로 변환하고 브라우저 다운로드를 트리거한다.
 * UTF-8 BOM을 포함하여 한글 등 다국어 문자 깨짐을 방지한다.
 */
export function downloadCsv(headers: string[], rows: Record<string, any>[], fileName: string): void {
  const csvContent = convertToCsv(headers, rows);
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, fileName);
  URL.revokeObjectURL(url);  // 메모리 누수 방지
}
```

```typescript
// libs/client/analytics/src/utils/export-xlsx.ts

import * as XLSX from 'xlsx';

/**
 * JSON 데이터를 XLSX 파일로 변환하고 브라우저 다운로드를 트리거한다.
 * SheetJS 라이브러리를 사용하여 워크북을 생성하고
 * Base64 -> 바이너리 변환 후 Blob으로 다운로드한다.
 */
export function downloadXlsx(headers: string[], rows: Record<string, any>[], fileName: string): void {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');
  const xlsxData = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

  // Base64 -> 바이너리 변환
  const binaryString = atob(xlsxData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, fileName);
  URL.revokeObjectURL(url);
}
```

### 2.5 기존 시스템 영향 분석

| 기존 시스템 | 영향 범위 | 설명 |
|------------|----------|------|
| `libs/server/response/` (FS-021) | 재사용 | ResponseFilterService를 AnalyticsModule에서 import하여 필터 엔진 재사용 |
| `packages/logic-engine/` (FS-012/014) | 재사용 | Drop-off 분석에서 조건 분기 시뮬레이션에 로직 평가 엔진 사용 |
| `libs/server/prisma/` | 재사용 | PrismaService를 통한 DB 조회 |
| `libs/server/audit-log/` | 재사용 | 내보내기 실행 시 감사 로그 기록 |
| `libs/client/core/` | 재사용 | apiFetch 래퍼를 통한 API 호출 |
| `libs/client/response/` (FS-021) | 부분 수정 | response-filter-bar.tsx를 공유 가능하도록 props 인터페이스 확장 |
| `apps/client/package.json` | 수정 | `xlsx` 패키지 의존성 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | AnalyticsModule import 추가 |
| i18n 번역 파일 | 수정 | ko/en 번역 키 추가 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| T-01 | 서버 Analytics 모듈 스캐폴딩 | `libs/server/analytics/` 모듈 구조 생성, NestJS 모듈/컨트롤러/서비스 기본 틀 | - | 낮음 | 1h |
| T-02 | SummaryService 구현 - 데이터 로딩 | Cursor 기반 페이지네이션(5,000건/배치) 전체 응답 로딩, Display Count/Quotas 병렬 조회 | T-01 | 중간 | 3h |
| T-03 | SummaryService 구현 - 메타 통계 계산 | Impressions, Starts, Completed, Drop-offs, TTC, Quotas Completed 계산 로직 | T-02 | 중간 | 2h |
| T-04 | SummaryService 구현 - 질문별 집계 | 14가지 질문 유형별 응답 집계 로직 (NPS, Rating, MultipleChoice 등) | T-02 | 높음 | 5h |
| T-05 | DropOffService 구현 | 조건 분기 시뮬레이션, 질문별 Impressions/Drop-off/TTC 분석 | T-01, packages/logic-engine | 높음 | 4h |
| T-06 | ExportService 구현 | 내보내기 데이터 조회, 헤더 구성(고정/조건부/동적), Storage URL 변환 | T-01 | 중간 | 3h |
| T-07 | AnalyticsController 구현 | Summary 조회 API, Export 데이터 조회 API, 권한 가드, DTO 검증 | T-02~T-06 | 중간 | 2h |
| T-08 | 서버 단위 테스트 | SummaryService, ExportService, DropOffService 단위 테스트 | T-02~T-06 | 중간 | 4h |
| T-09 | 클라이언트 Analytics 라이브러리 스캐폴딩 | `libs/client/analytics/` 구조 생성, 타입 정의, API 클라이언트 | - | 낮음 | 1h |
| T-10 | 순수 함수 계산기 구현 | meta-stats, nps, csat, drop-off, question-summary 계산 유틸리티 | T-09 | 높음 | 5h |
| T-11 | 순수 함수 단위 테스트 | 모든 Calculator 함수에 대한 Jest 테스트 (엣지 케이스 포함) | T-10 | 중간 | 3h |
| T-12 | 내보내기 유틸 구현 | CSV 생성기, XLSX 생성기(xlsx 라이브러리), 헤더 빌더, 다운로드 핸들러 | T-09 | 중간 | 3h |
| T-13 | xlsx 패키지 설치 및 설정 | `xlsx`(SheetJS) 패키지 설치, tree-shaking 설정 | - | 낮음 | 0.5h |
| T-14 | SVG 차트 컴포넌트 구현 | HalfCircle 게이지, ProgressBar, BarChart SVG 커스텀 컴포넌트 | T-09 | 중간 | 4h |
| T-15 | Summary 데이터 로딩 훅 | useSummaryData() - apiFetch + 로딩/에러 상태, 필터 변경 시 refetch | T-09, T-07 | 중간 | 2h |
| T-16 | 내보내기 실행 훅 | useExport() - 데이터 조회 + CSV/XLSX 변환 + 다운로드 트리거 | T-12, T-07 | 중간 | 2h |
| T-17 | MetaStatsBar 컴포넌트 | 6개 메타 통계 수평 배열, 조건부 Quotas Completed, Drop-offs 클릭 가능 | T-14, T-15 | 중간 | 2h |
| T-18 | NPS Summary 컴포넌트 | Aggregated 뷰(비율+ProgressBar), Individual 뷰(11개 바), HalfCircle 게이지 | T-14, T-10 | 높음 | 4h |
| T-19 | Rating/CSAT Summary 컴포넌트 | 평균 점수, 점수별 분포 바, CSAT 만족도 표시, 스킵 수 | T-14, T-10 | 중간 | 3h |
| T-20 | 기타 질문 유형 Summary 컴포넌트 | OpenText, MultipleChoice, PictureSelection, CTA, Consent, Date, FileUpload, Cal, Matrix, Address, ContactInfo, Ranking, HiddenFields (12종) | T-14, T-10 | 높음 | 8h |
| T-21 | QuestionSummaryRenderer 컴포넌트 | 질문 유형별 Summary 컴포넌트 디스패처, 질문 순서 배열 | T-18~T-20 | 낮음 | 1h |
| T-22 | DropOffTable 컴포넌트 | 질문별 Drop-off 분석 테이블 (Questions, TTC, Impressions, Drop-offs 4열) | T-14, T-15 | 중간 | 2h |
| T-23 | SummaryFilterBar 컴포넌트 | FS-021 필터 UI 재사용 또는 래핑, 필터 변경 시 Summary 재계산 트리거 | T-15 | 중간 | 2h |
| T-24 | ExportDropdown 컴포넌트 | CSV/XLSX 형식 선택 드롭다운, 로딩 상태, 권한 기반 활성화/비활성화 | T-16 | 중간 | 1.5h |
| T-25 | Summary 페이지 조립 | `[lng]/surveys/[surveyId]/summary/page.tsx` 라우트, 전체 레이아웃 조합 | T-17~T-24 | 중간 | 3h |
| T-26 | i18n 번역 키 추가 | ko/en 번역 파일에 Summary/Export 관련 모든 UI 텍스트 추가 | T-25 | 낮음 | 1.5h |
| T-27 | 클라이언트 컴포넌트 테스트 | 주요 컴포넌트 렌더링 테스트, 내보내기 다운로드 테스트 | T-25 | 중간 | 3h |
| T-28 | 통합 테스트 | Summary API 통합 테스트, Export API 통합 테스트, 필터 연동 테스트 | T-08, T-27 | 중간 | 3h |

**총 예상 시간: 약 73시간 (약 9~10일)**

### 3.2 구현 순서 및 마일스톤

#### 마일스톤 1: 서버 데이터 계층 (T-01 ~ T-06, 약 14h)
- 목표: Summary 및 Export API가 올바른 데이터를 반환하는지 확인
- 검증: API 엔드포인트를 직접 호출하여 JSON 응답 확인
- 순서: T-01 -> T-02 -> [T-03, T-04, T-05 병렬] -> T-06

#### 마일스톤 2: 서버 API 완성 및 테스트 (T-07 ~ T-08, 약 6h)
- 목표: 컨트롤러, DTO, 권한 가드 포함 API 완성
- 검증: Jest 단위 테스트 통과, 권한별 접근 제어 확인
- 순서: T-07 -> T-08

#### 마일스톤 3: 클라이언트 계산 엔진 (T-09 ~ T-13, 약 12.5h)
- 목표: 순수 함수 계산기 + 내보내기 유틸 + 단위 테스트 완성
- 검증: 모든 Calculator 함수의 Jest 테스트 통과, CSV/XLSX 생성 확인
- 순서: [T-09, T-13 병렬] -> [T-10, T-12 병렬] -> T-11

#### 마일스톤 4: 차트 및 UI 컴포넌트 (T-14 ~ T-24, 약 23.5h)
- 목표: 모든 Summary 컴포넌트 및 내보내기 UI 완성
- 검증: 각 컴포넌트의 Storybook 또는 개별 렌더링 확인
- 순서: T-14 -> [T-15, T-16 병렬] -> [T-17, T-18, T-19, T-20 병렬] -> T-21 -> [T-22, T-23, T-24 병렬]

#### 마일스톤 5: 페이지 조립 및 통합 (T-25 ~ T-28, 약 10.5h)
- 목표: Summary 페이지 완전 동작, i18n, 통합 테스트
- 검증: E2E 흐름 (Summary 조회 -> 필터 적용 -> 내보내기 다운로드) 통과
- 순서: T-25 -> T-26 -> T-27 -> T-28

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| `libs/server/analytics/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `libs/server/analytics/src/lib/analytics.module.ts` | 생성 | NestJS 모듈 정의 (PrismaModule, ResponseModule import) |
| `libs/server/analytics/src/lib/analytics.controller.ts` | 생성 | Summary 조회, Export 데이터 조회 엔드포인트 |
| `libs/server/analytics/src/lib/summary.service.ts` | 생성 | Summary 데이터 로딩, 메타 통계/질문별 집계 계산 |
| `libs/server/analytics/src/lib/export.service.ts` | 생성 | 내보내기 데이터 조회, 헤더 구성, Storage URL 변환 |
| `libs/server/analytics/src/lib/drop-off.service.ts` | 생성 | Drop-off 분석 (조건 분기 시뮬레이션) |
| `libs/server/analytics/src/lib/dto/summary-query.dto.ts` | 생성 | Summary 조회 DTO (class-validator) |
| `libs/server/analytics/src/lib/dto/export-query.dto.ts` | 생성 | 내보내기 DTO (class-validator) |
| `libs/server/analytics/src/lib/types/analytics.types.ts` | 생성 | 서버 타입 정의 |
| `libs/server/analytics/src/lib/utils/storage-url.util.ts` | 생성 | Storage URL 절대 경로 변환 유틸 |
| `libs/server/analytics/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/analytics/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/analytics/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/client/analytics/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `libs/client/analytics/src/lib/components/summary-page.tsx` | 생성 | Summary 페이지 메인 컨테이너 |
| `libs/client/analytics/src/lib/components/meta-stats-bar.tsx` | 생성 | 6개 메타 통계 수평 배열 |
| `libs/client/analytics/src/lib/components/drop-off-table.tsx` | 생성 | Drop-off 분석 테이블 |
| `libs/client/analytics/src/lib/components/summary-filter-bar.tsx` | 생성 | Summary 필터 UI (FS-021 재사용) |
| `libs/client/analytics/src/lib/components/export-dropdown.tsx` | 생성 | CSV/XLSX 내보내기 드롭다운 |
| `libs/client/analytics/src/lib/components/question-summary/question-summary-renderer.tsx` | 생성 | 질문 유형별 Summary 디스패처 |
| `libs/client/analytics/src/lib/components/question-summary/nps-summary.tsx` | 생성 | NPS 시각화 (Aggregated/Individual/HalfCircle) |
| `libs/client/analytics/src/lib/components/question-summary/rating-summary.tsx` | 생성 | Rating/CSAT 시각화 |
| `libs/client/analytics/src/lib/components/question-summary/multiple-choice-summary.tsx` | 생성 | 선택지별 카운트/비율 바 |
| `libs/client/analytics/src/lib/components/question-summary/open-text-summary.tsx` | 생성 | 텍스트 응답 샘플 목록 |
| `libs/client/analytics/src/lib/components/question-summary/picture-selection-summary.tsx` | 생성 | 이미지 갤러리 + 비율 |
| `libs/client/analytics/src/lib/components/question-summary/cta-summary.tsx` | 생성 | CTR 표시 |
| `libs/client/analytics/src/lib/components/question-summary/consent-summary.tsx` | 생성 | 수락/스킵 비율 |
| `libs/client/analytics/src/lib/components/question-summary/date-summary.tsx` | 생성 | 날짜 응답 샘플 목록 |
| `libs/client/analytics/src/lib/components/question-summary/file-upload-summary.tsx` | 생성 | 파일 목록 |
| `libs/client/analytics/src/lib/components/question-summary/cal-summary.tsx` | 생성 | 예약/스킵 비율 |
| `libs/client/analytics/src/lib/components/question-summary/matrix-summary.tsx` | 생성 | 교차 테이블 히트맵 |
| `libs/client/analytics/src/lib/components/question-summary/address-summary.tsx` | 생성 | 주소 응답 샘플 목록 |
| `libs/client/analytics/src/lib/components/question-summary/contact-info-summary.tsx` | 생성 | 연락처 응답 샘플 목록 |
| `libs/client/analytics/src/lib/components/question-summary/ranking-summary.tsx` | 생성 | 평균 순위 막대 그래프 |
| `libs/client/analytics/src/lib/components/question-summary/hidden-fields-summary.tsx` | 생성 | 히든 필드 키-값 목록 |
| `libs/client/analytics/src/lib/components/charts/half-circle-gauge.tsx` | 생성 | NPS 반원 게이지 SVG 컴포넌트 |
| `libs/client/analytics/src/lib/components/charts/progress-bar.tsx` | 생성 | 비율 바 컴포넌트 |
| `libs/client/analytics/src/lib/components/charts/bar-chart.tsx` | 생성 | 수직/수평 막대 그래프 컴포넌트 |
| `libs/client/analytics/src/lib/hooks/use-summary-data.ts` | 생성 | Summary 데이터 로딩 훅 |
| `libs/client/analytics/src/lib/hooks/use-export.ts` | 생성 | 내보내기 실행 훅 |
| `libs/client/analytics/src/lib/api/analytics-api.ts` | 생성 | apiFetch 기반 API 클라이언트 |
| `libs/client/analytics/src/lib/utils/meta-stats-calculator.ts` | 생성 | 메타 통계 계산 순수 함수 |
| `libs/client/analytics/src/lib/utils/nps-calculator.ts` | 생성 | NPS 스코어 계산 순수 함수 |
| `libs/client/analytics/src/lib/utils/csat-calculator.ts` | 생성 | CSAT 계산 순수 함수 |
| `libs/client/analytics/src/lib/utils/drop-off-calculator.ts` | 생성 | Drop-off 분석 순수 함수 |
| `libs/client/analytics/src/lib/utils/question-summary-calculator.ts` | 생성 | 질문 유형별 집계 순수 함수 |
| `libs/client/analytics/src/lib/utils/export-csv.ts` | 생성 | CSV 생성/다운로드 유틸 |
| `libs/client/analytics/src/lib/utils/export-xlsx.ts` | 생성 | XLSX 생성/다운로드 유틸 |
| `libs/client/analytics/src/lib/utils/export-header-builder.ts` | 생성 | 내보내기 헤더 구성 유틸 |
| `libs/client/analytics/src/lib/utils/format-ttc.ts` | 생성 | TTC 시간 포맷 유틸 |
| `libs/client/analytics/src/lib/types/analytics.types.ts` | 생성 | 클라이언트 타입 정의 |
| `libs/client/analytics/src/lib/schemas/export-schema.ts` | 생성 | 내보내기 옵션 zod 스키마 |
| `libs/client/analytics/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/client/analytics/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/client/analytics/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `apps/client/src/app/[lng]/surveys/[surveyId]/summary/page.tsx` | 생성 | Summary 페이지 라우트 |
| `apps/server/src/app/app.module.ts` | 수정 | AnalyticsModule import 추가 |
| `apps/client/package.json` | 수정 | `xlsx` 패키지 의존성 추가 |
| `apps/client/public/locales/ko/analytics.json` | 생성 | 한국어 번역 키 |
| `apps/client/public/locales/en/analytics.json` | 생성 | 영어 번역 키 |
| `tsconfig.base.json` | 수정 | `@inquiry/server-analytics`, `@inquiry/client-analytics` 경로 별칭 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 확률 | 완화 전략 |
|--------|------|------|----------|
| 대량 응답 데이터 메모리 초과 | 높음 | 중간 | Cursor 기반 배치 로딩으로 한 번에 메모리에 적재하는 양을 제한. 응답이 10만 건 이상인 경우 서버에서 집계를 수행하고 원시 데이터 대신 집계 결과만 반환하는 방식으로 전환 가능하도록 인터페이스를 설계 |
| 선행 모델 미구현 (Response, Display, Quota) | 높음 | 높음 | 구현 순서상 FS-021(응답 관리)이 FS-025보다 선행. 만약 선행 모델이 불완전한 경우 스텁 모델과 목(mock) 데이터로 개발 후 통합. 인터페이스 기반으로 서비스를 설계하여 모델 변경에 유연하게 대응 |
| Drop-off 분석의 로직 시뮬레이션 정확도 | 중간 | 중간 | packages/logic-engine의 evaluateConditionGroup()이 서버 사이드에서 올바르게 동작하는지 단위 테스트로 검증. 복잡한 조건 분기가 있는 설문의 테스트 케이스를 충분히 확보 |
| XLSX 라이브러리 번들 크기 | 중간 | 낮음 | `xlsx` 라이브러리가 약 400KB+. 동적 import(`import('xlsx')`)로 코드 스플리팅을 적용하여 초기 번들에 포함되지 않도록 함 |
| 브라우저 메모리 제한 (대량 내보내기) | 중간 | 낮음 | 내보내기 배치 크기를 3,000건으로 제한하고, 서버 스트리밍 방식으로의 전환을 향후 개선 사항으로 예약. 수만 건 이상 내보내기 시 경고 메시지 표시 |
| 14가지 질문 유형별 Summary 컴포넌트 볼륨 | 중간 | 높음 | 공통 레이아웃(SummaryCardWrapper)을 추출하여 반복 코드 최소화. BarChart, ProgressBar 등 공통 차트 컴포넌트를 먼저 구현하여 재사용 |
| 필터 시스템 통합 복잡도 | 중간 | 중간 | FS-021의 ResponseFilterService를 직접 재사용하되, Summary 전용 필터 변환이 필요한 경우 어댑터 패턴으로 확장. 초기에는 기본 필터만 지원하고 점진적으로 확장 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 대상 | 테스트 항목 | 비고 |
|------|------------|------|
| `meta-stats-calculator.ts` | (1) 정상 계산: starts%, completed%, dropOff%, TTC (2) 엣지: impressions=0, responses=0, ttc 데이터 없음 (3) 소수점 2자리 정밀도 | 순수 함수 |
| `nps-calculator.ts` | (1) Promoter/Passive/Detractor/Dismissed 정확 분류 (2) NPS 스코어 범위 -100~+100 (3) 모두 Dismissed인 경우 NPS=0 (4) 투명도 선형 보간 검증 | 순수 함수 |
| `csat-calculator.ts` | (1) 6가지 Range별 만족 기준 정확 적용 (2) CSAT% = 0% (응답 0건) (3) 평균 점수 소수점 2자리 (4) 스킵 수 집계 | 순수 함수 |
| `drop-off-calculator.ts` | (1) 질문별 impressions/dropOff 정확 집계 (2) Welcome Card 비활성화 시 첫 질문 impressions = displayCount (3) 조건 분기가 있는 설문의 경로 추적 | 로직 엔진 의존 |
| `question-summary-calculator.ts` | (1) MultipleChoice: 선택지별 카운트/비율 (2) Matrix: 행-열 교차 백분율 (3) Ranking: 평균 순위 (4) 샘플 50건 제한 | 14종 각각 |
| `export-csv.ts` | (1) UTF-8 BOM 포함 (2) 쉼표 포함 데이터 이스케이프 (3) 한글 문자 정상 처리 | 브라우저 모킹 |
| `export-xlsx.ts` | (1) Base64->바이너리 변환 정확성 (2) MIME 타입 정확성 (3) Object URL 해제 확인 | SheetJS 모킹 |
| `export-header-builder.ts` | (1) 고정 헤더 10개 순서 (2) 조건부 헤더(Quotas, Verified Email) (3) 동적 헤더(질문, 히든 필드, 변수) | 순수 함수 |
| `format-ttc.ts` | (1) 60초 이상 "Xm Xs" (2) 60초 미만 "Xs" (3) 소수점 2자리 (4) N/A | 순수 함수 |
| `SummaryService` | (1) Cursor 페이지네이션 정확 동작 (2) 병렬 조회 확인 (3) 필터 적용 시 필터링된 응답만 반환 | PrismaService 모킹 |
| `ExportService` | (1) 헤더 구성 정확성 (2) Storage URL 변환 (3) 선택된 행만 추출 | PrismaService 모킹 |
| `DropOffService` | (1) 조건 분기 없는 설문: 순차 경로 (2) 조건 분기 있는 설문: 분기별 경로 추적 (3) TTC N/A 처리 | 로직 엔진 모킹 |

### 5.2 통합 테스트

| 대상 | 테스트 항목 |
|------|------------|
| `GET /api/surveys/:surveyId/summary` | (1) 정상 응답 구조 (2) 인증 없이 401 (3) 존재하지 않는 surveyId 404 (4) 필터 적용 시 결과 변경 |
| `GET /api/surveys/:surveyId/export` | (1) CSV format 정상 응답 (2) XLSX format 정상 응답 (3) 권한 부족 시 403 (4) selectedResponseIds 적용 (5) 응답 0건 시 빈 배열 |
| 필터 + Summary 연동 | (1) 필터 조건 변경 -> Summary 재계산 (2) 필터 해제 -> 전체 데이터 복원 |
| 필터 + Export 연동 | (1) 필터 적용 상태에서 내보내기 -> 필터링된 데이터만 포함 |

### 5.3 E2E 테스트 (해당 시)

| 시나리오 | 검증 항목 |
|---------|----------|
| Summary 페이지 전체 흐름 | (1) Summary 페이지 접근 -> 메타 통계 표시 (2) 질문별 Summary 컴포넌트 렌더링 (3) Drop-offs 클릭 -> Drop-off 테이블로 스크롤 |
| 내보내기 흐름 | (1) 내보내기 버튼 클릭 -> CSV 선택 -> 파일 다운로드 (2) XLSX 선택 -> 파일 다운로드 (3) 다운로드된 파일의 헤더/행 수 검증 |
| 필터 + Summary | (1) 필터 적용 -> 통계 변경 확인 (2) 필터 해제 -> 원래 통계 복원 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| 선행 의존 | FS-021(응답 관리), FS-008(설문), FS-014(쿼터), FS-012(로직 엔진), FS-006(환경/프로젝트)이 선행 구현되어야 함. 미구현 시 스텁 기반 개발 |
| 대량 데이터 | Summary 데이터를 서버 메모리에 전부 로딩하는 구조는 응답 수가 매우 많을 경우(10만+ 건) 메모리 부하 발생 가능. 서버 사이드 스트리밍 집계는 향후 개선 |
| 브라우저 전용 내보내기 | 파일 다운로드가 브라우저에서만 동작. 서버 사이드 파일 생성/이메일 전송은 미지원 |
| 실시간 업데이트 없음 | Summary 페이지는 요청 시점 스냅샷. WebSocket/SSE 기반 실시간 업데이트는 미지원 |
| xlsx 라이브러리 크기 | SheetJS Community Edition은 약 400KB+ 번들. 동적 import로 완화하되, 초기 로딩에는 영향 없음 |
| CSAT Range 제한 | Range는 3, 4, 5, 6, 7, 10만 지원. 커스텀 Range는 미지원 |

### 6.2 향후 개선 가능 사항

| 항목 | 설명 |
|------|------|
| 서버 사이드 스트리밍 집계 | 대량 데이터 시 메모리 최적화를 위해 PostgreSQL Aggregation Query로 서버에서 직접 집계 후 결과만 반환 |
| Redis 캐싱 | 요청 레벨 캐싱을 Redis TTL 캐시로 업그레이드하여 서버 재시작 후에도 캐시 유지 |
| 서버 사이드 파일 생성 | 대량 내보내기 시 서버에서 CSV/XLSX 파일을 생성하여 S3에 업로드하고, 다운로드 링크를 반환하는 비동기 방식 |
| 실시간 대시보드 | WebSocket/SSE 기반 실시간 Summary 업데이트 |
| AI 기반 응답 분석 | OpenText 응답에 대한 감성 분석, 키워드 추출 등 AI 분석 (명세서 out-of-scope) |
| 커스텀 차트 | 사용자가 원하는 차트 유형/레이아웃을 직접 선택하는 대시보드 위젯 |
| PDF 내보내기 | Summary 보고서를 PDF로 생성하는 기능 |
| 예약 내보내기 | 주기적으로 자동 내보내기를 실행하여 이메일로 전송하는 기능 |

---

## 7. i18n 고려사항

### 추가할 번역 키 (analytics.json)

```json
{
  "summary": {
    "title": "요약",
    "impressions": "노출 수",
    "starts": "시작",
    "completed": "완료",
    "dropOffs": "이탈",
    "timeToComplete": "완료 소요 시간",
    "quotasCompleted": "쿼터 완료",
    "noData": "응답 데이터가 없습니다",
    "loading": "Summary 데이터를 불러오는 중...",
    "error": "데이터를 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.",
    "na": "N/A"
  },
  "nps": {
    "score": "NPS 스코어",
    "promoters": "추천자",
    "passives": "중립",
    "detractors": "비추천자",
    "dismissed": "스킵",
    "aggregated": "그룹별 보기",
    "individual": "점수별 보기"
  },
  "csat": {
    "satisfaction": "만족도",
    "averageScore": "평균 점수",
    "satisfiedCount": "만족 응답",
    "skipped": "스킵됨",
    "scoreDistribution": "점수 분포"
  },
  "dropOff": {
    "title": "이탈 분석",
    "questions": "질문",
    "ttc": "TTC",
    "impressions": "노출 수",
    "dropOffs": "이탈"
  },
  "questionSummary": {
    "noResponses": "응답이 없습니다",
    "responses": "개 응답",
    "clickThroughRate": "클릭률",
    "accepted": "수락",
    "skipped": "스킵",
    "booked": "예약",
    "averageRank": "평균 순위"
  },
  "export": {
    "title": "내보내기",
    "csv": "CSV로 내보내기",
    "xlsx": "XLSX로 내보내기",
    "downloading": "다운로드 중...",
    "noPermission": "내보내기 권한이 없습니다",
    "noData": "내보낼 데이터가 없습니다",
    "selectRows": "내보낼 행을 선택해 주세요",
    "selectedRows": "{{count}}개 선택됨"
  },
  "filter": {
    "applied": "필터 적용됨",
    "clear": "필터 해제",
    "noResults": "필터 조건에 맞는 응답이 없습니다"
  }
}
```

영어(`en/analytics.json`)도 동일한 키 구조로 영어 번역을 작성한다.
