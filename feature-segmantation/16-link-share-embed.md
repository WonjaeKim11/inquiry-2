# 링크 공유 및 임베드 — 요구사항 명세서

> **문서번호**: FSD-016 | **FR 범위**: FR-024
> **라이선스**: Community (기본) / Self-hosted Only (Pretty URL, Custom HTML)

---

## 1. 목적/배경

Formbricks의 Link Survey는 고유 URL을 통해 설문을 배포하는 핵심 배포 방식이다. 사용자는 생성된 설문 링크를 이메일, 소셜 미디어, 웹사이트 임베드, QR 코드 등 다양한 채널을 통해 배포할 수 있다. Share Modal은 이러한 다양한 배포 채널을 하나의 통합 인터페이스에서 관리할 수 있도록 설계되었으며, 임베드 모드(embed 파라미터)를 통해 iframe 내에서 배경/로고/푸터 없이 설문만 표시하는 기능을 제공한다. Self-hosted 환경에서는 Pretty URL(/p/{slug})을 통해 사용자 친화적 URL을 설정할 수 있다.

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- Share Modal의 10개 탭 구성 (Anonymous Links, Personal Links, Website Embed, Email, Social Media, QR Code, Dynamic Popup, Link Settings, Pretty URL, Custom HTML)
- 링크 설문 페이지 렌더링 파이프라인
- embed 파라미터를 통한 임베드 모드
- Pretty URL (/p/{slug}) — Self-hosted only
- OG meta tags 생성 및 링크 프리뷰
- iframe 완료 이벤트 (formbricksSurveyCompleted)
- 다국어 지원 (lang 파라미터)
- 설문 스타일링 결정 로직

### Out-of-scope
- Single-use 링크 (FSD-017에서 다룸)
- PIN/이메일 검증 (FSD-018에서 다룸)
- SDK 기반 인앱 설문 배포
- 응답 데이터 저장 및 분석

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Survey Creator | 설문 생성 후 배포 채널을 선택하고 링크를 공유하는 사용자 |
| Survey Respondent | 링크를 통해 설문에 접근하여 응답하는 최종 사용자 |
| Website Owner | 자사 웹사이트에 설문을 iframe으로 임베드하는 사용자 |
| Organization Admin | Pretty URL, Custom HTML 등 고급 설정을 관리하는 관리자 |

## 4. 기능 요구사항

### FR-024-01: Share Modal 탭 구성

Share Modal은 링크 설문 타입에 따라 최대 10개 탭을 제공한다.

**공유 방식 탭:**

| 탭 ID | 탭명 | 설명 |
|--------|------|------|
| Anonymous Links | Anonymous Links | 다회/일회용 링크 관리 |
| Personal Links | Personal Links | Contact 기반 개인화 링크 (Enterprise) |
| Website Embed | Embed on Website | iframe 임베드 코드 제공 |
| Email | Send Email | 이메일 발송 |
| Social Media | Social Media | 소셜 미디어 공유 |
| QR Code | QR Code | QR 코드 생성 |
| Dynamic Popup | Dynamic Popup | 동적 팝업 설정 |

**설정 탭:**

| 탭 ID | 탭명 | 설명 |
|--------|------|------|
| Link Settings | Link Settings | 링크 설정 (메타데이터, OG Image 등) |
| Pretty URL | Pretty URL | Pretty URL 설정 (Self-hosted only) |
| Custom HTML | Custom HTML | 커스텀 HTML/스크립트 주입 (Self-hosted only) |

**Formbricks Cloud 필터링 로직:**
- Pretty URL과 Custom HTML은 Cloud 환경에서 제외됨

**Single-use 활성 시 비활성화되는 탭:**
- Personal Links, Website Embed, Email, Social Media, QR Code (Single-use 활성 시 모두 비활성화)

### FR-024-02: 링크 설문 페이지 렌더링 파이프라인

링크 설문 페이지는 최적화된 3단계 데이터 페칭 전략을 사용한다.

**페이지 접근 시 URL 파라미터:**

| 파라미터 | 설명 |
|----------|------|
| suId | Single-use ID |
| verify | 이메일 인증 토큰 |
| lang | 언어 코드 |
| embed | 임베드 모드 |
| preview | 미리보기 모드 |

**데이터 페칭 단계:**

| 단계 | 작업 | 지연 감소 효과 |
|------|------|--------------|
| Stage 1 | Survey 조회 | 기본 데이터 (다른 모든 쿼리의 전제 조건) |
| Stage 2 | Environment Context, Locale, Single-use Response 병렬 조회 | 병렬화로 지연 감소 |
| Stage 3 | Multi-language Permission (Stage 2 billing 의존) | 순차 실행 |

**성능 최적화:**
- Survey 조회 시 요청 수준 캐싱 적용 → 메타데이터 생성과 페이지 컴포넌트 간 자동 중복 제거
- 최적화 전 대비 50-60% 지연 감소 (400-1500ms → 200-600ms)

### FR-024-03: 임베드 모드 (embed=true)

embed 파라미터가 true로 설정되면 배경, 로고, 푸터를 모두 제거하고 설문 컨텐츠만 렌더링한다.

**임베드 vs 일반 모드 차이점:**

| 요소 | 일반 모드 | 임베드 모드 |
|------|----------|------------|
| 배경 (MediaBackground) | O | X |
| 로고 (ClientLogo) | O | X |
| 법적 고지 (LegalFooter) | O | X |
| 미리보기 배너 | O | X |
| fullSizeCards | false | true |

### FR-024-04: iframe 완료 이벤트

설문 완료 시 부모 윈도우에 메시지 전달을 통해 완료 이벤트를 전송한다.

- **이벤트명**: "formbricksSurveyCompleted"
- **Target Origin**: 와일드카드 사용 (부모 윈도우의 origin을 알 수 없으므로)
- **발화 조건**: 응답 전송 완료 + 설문 종료 상태가 모두 충족될 때

### FR-024-05: Pretty URL (/p/{slug})

Self-hosted 환경에서만 사용 가능한 사용자 정의 URL 슬러그 기능이다.

**슬러그 유효성 규칙:**
- 소문자 알파벳, 숫자, 하이픈만 허용

**슬러그 업데이트 권한:**
- Organization owner/manager 또는 projectTeam readWrite 이상 권한 필요

**제약 조건:**
- 소문자 알파벳, 숫자, 하이픈만 허용
- Formbricks Cloud에서는 사용 불가
- URL 패턴: {publicDomain}/p/{slug}

### FR-024-06: OG Meta Tags 생성

링크 프리뷰를 위한 Open Graph 메타데이터를 자동 생성한다.

**생성되는 메타데이터:**
- Open Graph: 제목, 설명, URL, 이미지, 언어, 타입
- Twitter Card: summary_large_image 형식

**메타데이터 우선순위:**
1. 커스텀 Link Metadata (설문에 설정된 제목, 설명, OG 이미지)
2. Welcome Card headline
3. Survey name

**SEO 설정:**
- 검색 엔진 인덱싱 비활성화 (noindex)
- 링크 follow는 허용
- Google Bot 이미지 인덱싱 비활성화

### FR-024-07: 스타일링 결정 로직

스타일링 우선순위는 다음과 같다:
1. 프로젝트 설정에서 스타일 오버라이드가 허용되지 않은 경우 → 프로젝트 스타일 우선
2. 설문별 스타일 오버라이드가 활성화된 경우 → 설문별 스타일 적용
3. 그 외 → 프로젝트 기본 스타일 적용

### FR-024-08: 언어 코드 결정

언어 코드 결정 로직:
1. lang 파라미터가 없거나 다국어가 허용되지 않으면 → 기본 언어("default") 사용
2. lang 파라미터 값이 설문의 언어 코드 또는 별칭과 일치하는 언어를 검색
3. 일치하는 언어가 없거나, 기본 언어이거나, 비활성 상태이면 → 기본 언어 사용
4. 일치하는 언어가 활성 상태이면 → 해당 언어 코드 반환

### FR-024-09: 커스텀 스크립트 주입

Self-hosted 환경에서는 프로젝트 및 설문 수준의 커스텀 스크립트를 주입할 수 있다.

- 프로젝트 수준 스크립트와 설문 수준 스크립트를 모두 지원
- 스크립트 모드: "add" (프로젝트 스크립트에 추가) 또는 "replace" (프로젝트 스크립트 대체)
- Cloud 환경 및 미리보기 모드에서는 비활성화

### FR-024-10: Viewport 설정

- 너비: 기기 너비 사용
- 초기 배율: 1.0
- 최대 배율: 1.0
- 사용자 확대/축소: 비활성화
- Viewport fit: contain

## 5. 비기능 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-024-01 | 페이지 로딩 성능 | 3단계 최적화 파이프라인으로 200-600ms 수준의 지연 달성 |
| NFR-024-02 | 캐싱 | 요청 수준 캐싱 활용으로 동일 요청 내 Survey 조회 중복 제거 |
| NFR-024-03 | SEO | 검색 엔진 인덱싱 비활성화 (noindex), 링크 프리뷰용 OG 태그 제공 |
| NFR-024-04 | 접근성 | 모바일 확대 비활성화 (설문 레이아웃 보호) |
| NFR-024-05 | 보안 | iframe 메시지 전달에서 targetOrigin 와일드카드 사용 (부모 origin 불확실) |
| NFR-024-06 | 반응형 | 최대 너비 기반 설문 카드, 모바일/데스크톱 대응 |

## 6. 정책/제약

| 항목 | 값 |
|------|------|
| 설문 URL 패턴 | /s/{surveyId} |
| Pretty URL 패턴 | /p/{slug} |
| Slug 유효성 규칙 | 소문자 알파벳, 숫자, 하이픈만 허용 |
| Pretty URL 가용성 | Self-hosted only |
| Custom HTML 가용성 | Self-hosted only |
| 임베드 파라미터 | ?embed=true |
| 미리보기 파라미터 | ?preview=true |
| iframe 완료 이벤트 | "formbricksSurveyCompleted" |
| OG 이미지 API 경로 | /api/v1/client/og |
| Card arrangement 옵션 | "straight" / "casual" |
| 커스텀 스크립트 모드 | "add" / "replace" |
| 설문 상태 제한 | draft 또는 link 타입이 아닌 설문 → 404 |
| Autofocus | iframe 내에서는 비활성화 |
| 권한 (Slug 수정) | organization owner/manager 또는 projectTeam readWrite |

## 7. 수용 기준 (Acceptance Criteria)

| AC-ID | 시나리오 | 기대 결과 |
|-------|----------|----------|
| AC-024-01 | Link Survey URL 접근 | 설문이 정상 렌더링되며 OG 메타데이터가 포함됨 |
| AC-024-02 | embed=true 파라미터로 접근 | 배경, 로고, 푸터 없이 설문만 표시됨 |
| AC-024-03 | Share Modal에서 Anonymous Links 탭 | 설문 URL이 표시되고 복사 가능 |
| AC-024-04 | Share Modal에서 QR Code 탭 | 설문 URL의 QR 코드가 생성됨 |
| AC-024-05 | Pretty URL 설정 (Self-hosted) | /p/{slug} 경로로 설문 접근 가능 |
| AC-024-06 | Pretty URL 설정 (Cloud) | Pretty URL 탭이 표시되지 않음 |
| AC-024-07 | iframe 내 설문 완료 | 부모 윈도우에 formbricksSurveyCompleted 메시지 전달 |
| AC-024-08 | lang=de 파라미터 전달 | 독일어 번역이 제공되는 경우 해당 언어로 설문 표시 |
| AC-024-09 | Draft 상태 설문 접근 | 404 Not Found 반환 |
| AC-024-10 | App 타입 설문에 링크 접근 | 404 Not Found 반환 |
| AC-024-11 | Single-use 활성 시 Share Modal | Personal Links, Embed, Email, Social, QR 탭 비활성화 |
| AC-024-12 | 커스텀 Link Metadata 설정 | OG 태그에 커스텀 제목/설명/이미지 반영 |
| AC-024-13 | Slug에 대문자/특수문자 입력 | 검증 실패로 설정 불가 |
| AC-024-14 | Whitelabel favicon 설정된 Organization | 커스텀 favicon이 링크 설문에 적용됨 |
