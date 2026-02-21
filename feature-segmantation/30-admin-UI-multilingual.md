# 관리자 UI 다국어(i18n) — 요구사항 명세서

> **문서번호**: FSD-030 | **FR 범위**: FR-049
> **라이선스**: Community (기본 기능)

---

## 1. 목적/배경

Formbricks 관리자 UI는 14개 언어를 지원하며, react-i18next 기반의 국제화(i18n) 시스템을 사용한다. 서버 사이드와 클라이언트 사이드 모두에서 번역이 지원되며, ICU Message Format을 통해 복수형, 성별 등의 복잡한 문자열 처리가 가능하다. 비로그인 사용자에게는 브라우저의 Accept-Language 헤더를 기반으로 언어를 자동 감지하고, 로그인 사용자에게는 프로필에 저장된 로케일 설정을 적용한다.

참고: 이 문서에서 다루는 i18n은 **관리자 UI**의 다국어 지원이며, 설문 자체의 다국어 지원(Multi-language Surveys)은 별도의 Enterprise 기능이다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- 관리자 UI 14개 언어 번역
- 서버 사이드 번역
- 클라이언트 사이드 번역
- Accept-Language 헤더 기반 로케일 감지
- 사용자 프로필 로케일 설정
- ICU Message Format 지원
- 번역 키 명명 규칙
- 번역 파일 관리 체계

### Out-of-scope
- 설문 콘텐츠 다국어 지원 (Multi-language Surveys, Enterprise 기능)
- RTL(Right-to-Left) 언어 지원
- 자동 번역 (번역은 수동으로 관리)

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| 모든 사용자 | UI 언어 설정 가능 |
| 비로그인 방문자 | 브라우저 언어에 맞춘 자동 로케일 적용 |
| 개발자 | 번역 키 추가 및 번역 파일 관리 |
| 번역 기여자 | 오픈소스 번역 기여 |

---

## 4. 기능 요구사항

### FR-049-01: 지원 언어 (14개)

기본 로케일: en-US

지원 언어 목록:

| 로케일 코드 | 언어 |
|------------|------|
| de-DE | German (독일어) |
| en-US | English US (영어) |
| es-ES | Spanish (스페인어) |
| fr-FR | French (프랑스어) |
| hu-HU | Hungarian (헝가리어) |
| ja-JP | Japanese (일본어) |
| nl-NL | Dutch (네덜란드어) |
| pt-BR | Portuguese Brazil (포르투갈어-브라질) |
| pt-PT | Portuguese Portugal (포르투갈어-포르투갈) |
| ro-RO | Romanian (루마니아어) |
| ru-RU | Russian (러시아어) |
| sv-SE | Swedish (스웨덴어) |
| zh-Hans-CN | Chinese Simplified (중국어-간체) |
| zh-Hant-TW | Chinese Traditional (중국어-번체) |

각 로케일에 대응하는 JSON 번역 파일이 존재한다.

### FR-049-02: 사용자 로케일 저장

사용자 로케일은 User 모델의 locale 필드에 저장되며, 기본값은 en-US이다.

사용자 로케일은 프로필 설정에서 변경 가능하며, 사용자 정보 업데이트 시 함께 저장된다.

### FR-049-03: 로케일 결정 로직

로케일 결정은 다음 우선순위로 처리된다:

1. **로그인 사용자**: DB에 저장된 로케일 사용
2. **비로그인 사용자**: Accept-Language 헤더 기반 감지
3. **폴백**: en-US

#### Accept-Language 헤더 기반 감지

**매칭 우선순위**:
1. 정확한 로케일 코드 매칭 (예: de-DE -> de-DE)
2. 언어 코드 접두사 매칭 (예: de -> de-DE, pt -> pt-BR)
3. 폴백: en-US

### FR-049-04: 서버 사이드 번역

서버 사이드 번역은 i18next 인스턴스를 생성하여 처리한다:

- ICU Message Format 플러그인 사용
- 번역 파일은 동적 import로 필요한 로케일만 로드
- 폴백 로케일: en-US
- React의 내장 XSS 방지에 의존 (별도 escape 처리 비활성화)

서버 컴포넌트에서는 서버 번역 함수를 통해 번역된 텍스트를 가져온다.

### FR-049-05: 클라이언트 사이드 번역

클라이언트 컴포넌트에서는 react-i18next의 useTranslation hook을 사용하여 번역된 텍스트를 가져온다.

### FR-049-06: 번역 키 명명 규칙

번역 키는 **소문자 + 점(dot) 구분자** 형식을 따른다.

형식: {모듈}.{하위경로}.{설명_snake_case}

예시:
- common.welcome - 공통 환영 메시지
- common.save - 공통 저장 버튼
- common.surveys - 공통 설문 텍스트
- environments.settings.billing.free - 빌링 설정의 Free 플랜
- environments.settings.notifications.email_alerts_surveys - 알림 설정 제목
- environments.segments.operator_is_set - 세그먼트 연산자 텍스트
- environments.contacts.date_value_required - 연락처 날짜 필수 에러

### FR-049-07: ICU Message Format 지원

i18next-icu 플러그인을 통해 ICU Message Format을 지원한다. 이를 통해:

- **복수형 처리**: 예) "{count, plural, one {# item} other {# items}}"
- **성별 처리**: 예) "{gender, select, male {He} female {She} other {They}}"
- **변수 보간**: 예) "Hello, {name}!"
- **날짜/숫자 포맷**: ICU 표준 포맷

### FR-049-08: 설문 UI 다국어 (i18n-utils)

설문 콘텐츠(질문, 선택지 등)의 다국어 처리를 위한 유틸리티 패키지. ISO 639 언어 코드 데이터베이스를 포함하며, 각 언어 이름이 14개 지원 로케일로 번역되어 있다.

각 언어 항목은 코드와 14개 로케일별 표시 이름을 가진다.

### FR-049-09: 다국어 설문 콘텐츠 지원 (i18nString)

설문 콘텐츠의 다국어 문자열은 i18nString 타입을 사용하며, 다음 기능을 제공한다:

- **i18n 문자열 생성**: 텍스트와 대상 언어 목록을 받아 다국어 문자열 객체 생성
- **i18n 객체 여부 확인**: 값이 다국어 문자열 객체인지 판별
- **특정 언어의 값 추출**: 다국어 문자열에서 지정 언어의 번역 값을 가져옴
- **설문 언어 코드 추출**: 설문에 설정된 언어 코드 목록을 가져옴

i18nString 구조는 "default" 키에 기본 언어 텍스트, 각 언어 코드에 해당 번역을 저장하는 형태이다. 예: { "default": "Welcome to our survey", "de": "Willkommen zu unserer Umfrage", "fr": "Bienvenue dans notre sondage" }

### FR-049-10: 앱 언어 목록

UI에서 언어 선택 드롭다운에 표시되는 14개 언어 목록을 제공한다. 각 항목은 로케일 코드와 영어 표시 이름을 가진다.

| 로케일 코드 | 표시 이름 |
|------------|----------|
| de-DE | German |
| en-US | English (US) |
| es-ES | Spanish |
| fr-FR | French |
| hu-HU | Hungarian |
| ja-JP | Japanese |
| nl-NL | Dutch |
| pt-BR | Portuguese (Brazil) |
| pt-PT | Portuguese (Portugal) |
| ro-RO | Romanian |
| ru-RU | Russian |
| sv-SE | Swedish |
| zh-Hans-CN | Chinese (Simplified) |
| zh-Hant-TW | Chinese (Traditional) |

### FR-049-11: 번역 검증

번역 파일의 누락된 키를 자동으로 스캔하고 검증하는 도구를 제공한다.

---

## 5. 비기능 요구사항

| ID | 항목 | 내용 |
|----|------|------|
| NFR-I01 | 성능 | 번역 파일은 동적 import로 필요한 로케일만 로드 |
| NFR-I02 | 폴백 | 번역 키가 현재 로케일에 없으면 en-US 폴백 |
| NFR-I03 | 보안 | escape 비활성화 설정 (React의 내장 XSS 방지에 의존) |
| NFR-I04 | 유지보수 | 번역 키 누락 자동 검증 도구 제공 |
| NFR-I05 | 확장성 | 새 언어 추가 시 JSON 파일 추가 + 지원 로케일 배열에 코드 추가 |
| NFR-I06 | 서버/클라이언트 일관성 | 서버 번역 함수와 클라이언트 번역 hook 모두 동일한 번역 파일 사용 |

---

## 6. 정책/제약

| 항목 | 값 |
|------|-----|
| 지원 언어 수 | 14개 |
| 기본 로케일 | en-US |
| 폴백 로케일 | en-US |
| 번역 파일 형식 | JSON |
| 메시지 포맷 | ICU Message Format |
| 번역 라이브러리 | react-i18next + i18next |
| 키 네이밍 | 소문자 + 점 구분자 |
| XSS 방지 | React 내장 (escape 비활성화) |
| 로케일 저장 | User 모델의 locale 필드 (DB) |
| 로케일 기본값 | en-US |
| Accept-Language 매칭 | 정확 매칭 -> 접두사 매칭 -> 폴백 |
| 서버 번역 | 서버 번역 함수 |
| 클라이언트 번역 | useTranslation hook |

---

## 7. 수용 기준 (Acceptance Criteria)

| AC-ID | 기준 |
|-------|------|
| AC-030-01 | 14개 지원 언어 각각에 대한 번역 파일이 존재한다 |
| AC-030-02 | 로그인 사용자가 프로필에서 로케일을 변경하면 UI 언어가 즉시 전환된다 |
| AC-030-03 | 비로그인 사용자 접속 시 Accept-Language 헤더 기반으로 적절한 언어가 적용된다 |
| AC-030-04 | Accept-Language 헤더에 지원하지 않는 언어만 있으면 en-US로 폴백된다 |
| AC-030-05 | Accept-Language에 de 전송 시 de-DE 로케일로 매칭된다 (접두사 매칭) |
| AC-030-06 | 서버 컴포넌트에서 서버 번역 함수로 올바른 번역이 반환된다 |
| AC-030-07 | 클라이언트 컴포넌트에서 useTranslation hook으로 올바른 번역이 반환된다 |
| AC-030-08 | 번역 키가 현재 로케일에 없을 때 en-US 폴백이 동작한다 |
| AC-030-09 | ICU Message Format의 복수형 처리가 올바르게 작동한다 |
| AC-030-10 | 번역 검증 도구 실행 시 누락된 번역 키가 보고된다 |
| AC-030-11 | 새 번역 키 추가 시 모든 14개 로케일 파일에 키가 존재해야 한다 |
| AC-030-12 | 이메일 알림이 수신자의 로케일에 맞는 언어로 발송된다 |
| AC-030-13 | 설문 UI 언어와 관리자 UI 언어가 독립적으로 설정된다 |
