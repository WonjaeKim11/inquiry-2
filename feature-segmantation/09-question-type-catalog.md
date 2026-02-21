# 질문 유형 카탈로그 -- 요구사항 명세서

> **문서번호**: FSD-009 | **FR 범위**: FR-013
> **라이선스**: Community

---

## 1. 목적/배경

Formbricks는 15가지 질문(Element) 유형을 지원하며, 각 유형은 고유 type ID를 갖는다. 모든 Element는 공통 기본 속성을 확장하고, 유형별 고유 속성과 validation 규칙을 가진다. 이 문서는 각 질문 유형의 속성, 유효성 검증 규칙을 상세 정의한다.

## 2. 범위

### In-scope
- 15가지 질문(Element) 유형의 전체 스키마
- Element ID 규칙 및 금지 ID
- 각 유형별 고유 속성과 기본값
- Validation 규칙 시스템
- 유형별 적용 가능한 validation 규칙 매핑

### Out-of-scope
- 설문 편집기 UI 컴포넌트
- Logic/Branching 상세
- 응답 데이터 저장 포맷

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| 설문 작성자 | 적절한 질문 유형을 선택하여 설문 구성 |
| 응답자 | 각 질문 유형의 UI를 통해 응답 입력 |
| 시스템 | 유효성 검증 규칙에 따른 응답 검증 |

## 4. 기능 요구사항

### FR-013: 질문 유형 정의

#### 4.1 Element Type (15가지)

| # | 유형 ID | 유형 이름 |
|---|---------|-----------|
| 1 | fileUpload | 파일 업로드 |
| 2 | openText | 자유 텍스트 |
| 3 | multipleChoiceSingle | 단일 선택 |
| 4 | multipleChoiceMulti | 복수 선택 |
| 5 | nps | NPS (Net Promoter Score) |
| 6 | cta | CTA (Call-to-Action) |
| 7 | rating | 평가 |
| 8 | consent | 동의 |
| 9 | pictureSelection | 이미지 선택 |
| 10 | cal | 일정 예약 (Cal.com) |
| 11 | date | 날짜 입력 |
| 12 | matrix | 행렬(표) |
| 13 | address | 주소 입력 |
| 14 | ranking | 순위 지정 |
| 15 | contactInfo | 연락처 정보 |

#### 4.2 Element 기본 속성

모든 질문 유형이 공유하는 기본 속성:

| 속성 | 타입 | 필수 여부 | 설명 |
|------|------|-----------|------|
| ID | Element ID | 필수 | 고유 식별자 |
| 유형 | Element Type enum | 필수 | 질문 유형 |
| 제목 | 다국어 문자열 | 필수 | 질문 제목 |
| 부제목 | 다국어 문자열 | 선택 | 질문 부제목 |
| 이미지 URL | Storage URL | 선택 | 이미지 |
| 비디오 URL | Storage URL | 선택 | 비디오 |
| 필수 응답 여부 | boolean | 필수 | 필수 응답 여부 |
| 평가 척도 | enum (number, smiley, star) | 선택 | 평가 유형 |
| 범위 | 리터럴 (3~10) | 선택 | 평가 범위 |
| 임시 저장 상태 | boolean | 선택 | 임시 저장 여부 |

#### 4.3 Element ID 규칙

Element ID 유효성 검증:
- 금지된 ID 사용 불가
- 공백 불허
- 영문, 숫자, 하이픈, 언더스코어만 허용

금지된 ID 목록:
userId, source, suid, end, start, welcomeCard, hidden, verifiedEmail, multiLanguage, embed

---

### 4.4 유형 1: OpenText (자유 텍스트)

자유 텍스트 입력 질문.

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| 플레이스홀더 | 다국어 문자열 (선택) | - | 입력 필드 플레이스홀더 |
| 장문 응답 | boolean (선택) | - | 장문 응답 모드 (textarea) |
| 입력 유형 | enum | text | 입력 유형: text, email, url, number, phone |
| AI 인사이트 활성화 | boolean | false | AI 인사이트 활성화 |
| 글자 수 제한 활성화 | boolean | false | 글자 수 제한 활성화 |
| 최소 글자 수 | number (선택) | - | 최소 글자 수 |
| 최대 글자 수 | number (선택) | - | 최대 글자 수 |

**글자 수 제한 검증 규칙**:
- 활성화 시 최소값 또는 최대값 중 하나 이상 필수
- 최소/최대 값은 양수여야 함
- 최소값이 최대값보다 클 수 없음

**적용 가능한 Validation Rules**:
minLength, maxLength, pattern, email, url, phone, equals, doesNotEqual, contains, doesNotContain, minValue, maxValue, isGreaterThan, isLessThan

---

### 4.5 유형 2: MultipleChoiceSingle (단일 선택)

단일 선택 객관식 질문.

| 속성 | 타입 | 제약 | 설명 |
|------|------|------|------|
| 선택지 | 선택지 배열 | 최소 2개 | 선택지 목록 |
| 셔플 옵션 | enum (선택) | - | 셔플: none, all, exceptLast |
| "기타" 플레이스홀더 | 다국어 문자열 (선택) | - | "기타" 옵션 플레이스홀더 |
| 표시 유형 | enum (선택) | - | 표시: list, dropdown |

**적용 가능한 Validation Rules**: 없음 (단일 선택)

---

### 4.6 유형 3: MultipleChoiceMulti (복수 선택)

복수 선택 객관식 질문.

MultipleChoiceSingle과 동일한 속성에 validation 추가.

**적용 가능한 Validation Rules**: minSelections, maxSelections

---

### 4.7 유형 4: NPS (Net Promoter Score)

Net Promoter Score 질문 (0~10 척도).

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| 하단 레이블 | 다국어 문자열 (선택) | - | 최하단 레이블 (예: "Not likely") |
| 상단 레이블 | 다국어 문자열 (선택) | - | 최상단 레이블 (예: "Very likely") |
| 색상 코딩 활성화 | boolean | false | 색상 코딩 활성화 (Detractor/Passive/Promoter) |

**적용 가능한 Validation Rules**: 없음

---

### 4.8 유형 5: CTA (Call-to-Action)

Call-to-Action 버튼 질문.

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| 외부 버튼 여부 | boolean | false | 외부 링크 버튼 여부 |
| 버튼 URL | 문자열 (선택) | - | 외부 링크 URL |
| CTA 버튼 라벨 | 다국어 문자열 (선택) | - | 버튼 텍스트 |

**CTA 검증 규칙**:
- 외부 버튼 활성화 시:
  - 버튼 URL 필수이고 유효한 URL이어야 함
  - CTA 버튼 라벨 필수 (기본 언어의 값이 비어 있으면 안 됨)

**적용 가능한 Validation Rules**: 없음

---

### 4.9 유형 6: Rating (평가)

별점/숫자/이모지 평가 질문.

| 속성 | 타입 | 값 범위 | 설명 |
|------|------|---------|------|
| 척도 유형 | enum | number, smiley, star | 평가 아이콘 유형 |
| 범위 | literal union | 3, 4, 5, 6, 7, 8, 9, 10 | 척도 범위 (3~10) |
| 하단 레이블 | 다국어 문자열 (선택) | - | 최저점 레이블 |
| 상단 레이블 | 다국어 문자열 (선택) | - | 최고점 레이블 |
| 색상 코딩 활성화 | boolean | false | 색상 코딩 |

**적용 가능한 Validation Rules**: 없음

---

### 4.10 유형 7: Consent (동의)

동의/동의하지 않음 질문.

| 속성 | 타입 | 설명 |
|------|------|------|
| 동의 레이블 | 다국어 문자열 (필수) | 동의 텍스트 |

**적용 가능한 Validation Rules**: 없음

---

### 4.11 유형 8: PictureSelection (이미지 선택)

이미지 선택 질문.

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| 복수 선택 허용 | boolean | false | 복수 선택 허용 |
| 선택지 | 이미지 선택지 배열 | - | 최소 2개 이미지 선택지 |

이미지 선택지 구성: 각 선택지는 고유 ID와 이미지 URL(필수)로 구성.

**적용 가능한 Validation Rules**: minSelections, maxSelections (복수 선택 허용 시 동적 적용)

---

### 4.12 유형 9: Date (날짜 입력)

날짜 입력 질문.

| 속성 | 타입 | 설명 |
|------|------|------|
| HTML | 다국어 문자열 (선택) | 추가 설명 |
| 날짜 포맷 | enum | 날짜 표시 형식 |

| 날짜 포맷 | 표시 형식 | 예시 |
|-----------|-----------|------|
| M-d-y | MM-DD-YYYY | 02-21-2026 |
| d-M-y | DD-MM-YYYY | 21-02-2026 |
| y-M-d | YYYY-MM-DD | 2026-02-21 |

**적용 가능한 Validation Rules**: isLaterThan, isEarlierThan, isBetween, isNotBetween

날짜 validation 파라미터:
- isLaterThan / isEarlierThan: 기준 날짜 (YYYY-MM-DD 포맷)
- isBetween / isNotBetween: 시작 날짜, 종료 날짜

---

### 4.13 유형 10: FileUpload (파일 업로드)

파일 업로드 질문.

| 속성 | 타입 | 설명 |
|------|------|------|
| 복수 파일 허용 | boolean | 복수 파일 업로드 허용 |
| 최대 파일 크기 (MB) | number (선택) | 최대 파일 크기 |
| 허용 확장자 | 문자열 배열 (선택) | 허용 파일 확장자 목록 |

**허용 파일 확장자** (26가지):
- 이미지: heic, png, jpeg, jpg, webp, ico
- 문서: pdf, eml, doc, docx, xls, xlsx, ppt, pptx, txt, csv
- 비디오: mp4, mov, avi, mkv, webm
- 오디오: mp3
- 압축: zip, rar, 7z, tar

**적용 가능한 Validation Rules**: fileExtensionIs, fileExtensionIsNot

---

### 4.14 유형 11: Cal (일정 예약)

Cal.com 일정 예약 질문.

| 속성 | 타입 | 제약 | 설명 |
|------|------|------|------|
| Cal 사용자 이름 | 문자열 | 최소 1자 필수 | Cal.com 사용자 이름 |
| Cal 호스트 | 문자열 (선택) | - | Cal.com 호스트 URL |

**적용 가능한 Validation Rules**: 없음

---

### 4.15 유형 12: Matrix (행렬)

행렬(표) 형태 질문.

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| 행 항목 | 행렬 선택지 배열 | - | 행 항목 목록 (각 항목에 ID와 다국어 레이블) |
| 열 항목 | 행렬 선택지 배열 | - | 열 항목 목록 (각 항목에 ID와 다국어 레이블) |
| 셔플 옵션 | enum | none | 행 셔플: none, all, exceptLast |

**적용 가능한 Validation Rules**: minRowsAnswered, answerAllRows

---

### 4.16 유형 13: Address (주소 입력)

주소 입력 질문 (6개 필드 토글).

6개 주소 필드:

| 필드 | 설명 |
|------|------|
| 주소 라인 1 | 주소 라인 1 |
| 주소 라인 2 | 주소 라인 2 |
| 도시 | 도시 |
| 시/도 | 시/도 |
| 우편번호 | 우편번호 |
| 국가 | 국가 |

각 필드는 3가지 속성으로 개별 제어:
- 표시 여부 (show): 필드 표시/숨김
- 필수 여부 (required): 필수 응답 여부
- 플레이스홀더: 입력 안내 텍스트

**Validation Rule의 field 옵션**: addressLine1, addressLine2, city, state, zip, country

**적용 가능한 Validation Rules**: minLength, maxLength, pattern, email, url, phone, equals, doesNotEqual, contains, doesNotContain (field 속성으로 특정 서브 필드 지정)

---

### 4.17 유형 14: Ranking (순위 지정)

순위 지정(드래그 앤 드롭) 질문.

| 속성 | 타입 | 제약 | 설명 |
|------|------|------|------|
| 선택지 | 선택지 배열 | 2~25개 | 순위 지정 항목 |
| 셔플 옵션 | enum (선택) | - | 셔플: none, all, exceptLast |
| "기타" 플레이스홀더 | 다국어 문자열 (선택) | - | "기타" 옵션 플레이스홀더 |

**적용 가능한 Validation Rules**: minRanked, rankAll

---

### 4.18 유형 15: ContactInfo (연락처 정보)

연락처 정보 입력 질문 (5개 필드 토글).

5개 연락처 필드:

| 필드 | 설명 |
|------|------|
| 이름 (firstName) | 이름 |
| 성 (lastName) | 성 |
| 이메일 (email) | 이메일 |
| 전화번호 (phone) | 전화번호 |
| 회사 (company) | 회사 |

각 필드는 3가지 속성으로 개별 제어:
- 표시 여부 (show): 필드 표시/숨김
- 필수 여부 (required): 필수 응답 여부
- 플레이스홀더: 입력 안내 텍스트

**Validation Rule의 field 옵션**: firstName, lastName, email, phone, company

**적용 가능한 Validation Rules**: minLength, maxLength, pattern, email, url, phone, equals, doesNotEqual, contains, doesNotContain

---

### 4.19 Validation 규칙 시스템

#### Validation Rule 구조

각 Validation Rule은 다음으로 구성:
- ID: 고유 식별자
- 유형: Validation Rule 유형
- 파라미터: 규칙별 파라미터
- 필드: 대상 서브 필드 (Address/ContactInfo용, 선택)

#### Validation Logic

- and: 모든 규칙을 충족해야 유효 (기본값)
- or: 하나 이상의 규칙을 충족하면 유효

#### 전체 Validation Rule Type 목록

| 카테고리 | Rule Type | 파라미터 | 적용 유형 |
|----------|-----------|----------|-----------|
| 텍스트 | minLength | 최소 길이 (숫자) | openText, address, contactInfo |
| 텍스트 | maxLength | 최대 길이 (숫자) | openText, address, contactInfo |
| 텍스트 | pattern | 정규식 패턴 + 플래그 (선택) | openText, address, contactInfo |
| 텍스트 | email | 엄격 검증 (파라미터 없음) | openText, address, contactInfo |
| 텍스트 | url | 엄격 검증 (파라미터 없음) | openText, address, contactInfo |
| 텍스트 | phone | 엄격 검증 (파라미터 없음) | openText, address, contactInfo |
| 텍스트 | equals | 비교 값 (문자열) | openText, address, contactInfo |
| 텍스트 | doesNotEqual | 비교 값 (문자열) | openText, address, contactInfo |
| 텍스트 | contains | 포함 값 (문자열) | openText, address, contactInfo |
| 텍스트 | doesNotContain | 미포함 값 (문자열) | openText, address, contactInfo |
| 숫자 | minValue | 최솟값 (숫자) | openText (입력 유형=number) |
| 숫자 | maxValue | 최댓값 (숫자) | openText (입력 유형=number) |
| 숫자 | isGreaterThan | 기준값 초과 (숫자) | openText (입력 유형=number) |
| 숫자 | isLessThan | 기준값 미만 (숫자) | openText (입력 유형=number) |
| 선택 | minSelections | 최소 선택 수 (1 이상) | multipleChoiceMulti, pictureSelection |
| 선택 | maxSelections | 최대 선택 수 (1 이상) | multipleChoiceMulti, pictureSelection |
| 날짜 | isLaterThan | 기준 날짜 (문자열) | date |
| 날짜 | isEarlierThan | 기준 날짜 (문자열) | date |
| 날짜 | isBetween | 시작 날짜, 종료 날짜 | date |
| 날짜 | isNotBetween | 시작 날짜, 종료 날짜 | date |
| 순위 | minRanked | 최소 순위 수 (1 이상) | ranking |
| 순위 | rankAll | 모든 항목 순위 지정 (파라미터 없음) | ranking |
| 행렬 | minRowsAnswered | 최소 응답 행 수 (1 이상) | matrix |
| 행렬 | answerAllRows | 모든 행 응답 (파라미터 없음) | matrix |
| 파일 | fileExtensionIs | 허용 확장자 목록 (1개 이상) | fileUpload |
| 파일 | fileExtensionIsNot | 차단 확장자 목록 (1개 이상) | fileUpload |

#### 유형별 적용 가능한 Validation Rules 매핑

| Element 유형 | 적용 가능한 Rules |
|-------------|-------------------|
| openText | minLength, maxLength, pattern, email, url, phone, equals, doesNotEqual, contains, doesNotContain, minValue, maxValue, isGreaterThan, isLessThan |
| multipleChoiceMulti | minSelections, maxSelections |
| date | isLaterThan, isEarlierThan, isBetween, isNotBetween |
| matrix | minRowsAnswered, answerAllRows |
| ranking | minRanked, rankAll |
| fileUpload | fileExtensionIs, fileExtensionIsNot |
| pictureSelection | minSelections, maxSelections |
| address | minLength, maxLength, pattern, email, url, phone, equals, doesNotEqual, contains, doesNotContain |
| contactInfo | minLength, maxLength, pattern, email, url, phone, equals, doesNotEqual, contains, doesNotContain |

Validation이 없는 유형: multipleChoiceSingle, nps, cta, rating, consent, cal

### 4.20 Shuffle Option

| 옵션 | 설명 |
|------|------|
| none | 셔플 없음 (기본) |
| all | 모든 선택지 셔플 |
| exceptLast | 마지막 선택지 제외하고 셔플 ("기타" 항목 유지) |

적용 유형: multipleChoiceSingle, multipleChoiceMulti, matrix, ranking

### 4.21 Display Type (Multiple Choice)

- list: 기본 라디오/체크박스 목록
- dropdown: 드롭다운 메뉴

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 타입 안전성 | discriminated union 방식으로 유형별 엄격한 검증 |
| 하위 호환성 | 기존 질문 유형 enum 유지, 새 Element 유형 enum 사용 권장 |
| 확장성 | Validation Rule 유형 enum으로 새 규칙 추가 용이 |
| 클라이언트 검증 | 파일 크기 검증은 클라이언트 사이드에서 최대 크기(MB)로 처리 |

## 6. 정책/제약

| 정책 | 값 |
|------|-----|
| 질문 유형 수 | 15가지 |
| Rating 척도 유형 옵션 | number, smiley, star |
| Rating 범위 | 3, 4, 5, 6, 7, 8, 9, 10 (8가지) |
| Date 포맷 | M-d-y, d-M-y, y-M-d (3가지) |
| Multiple Choice 최소 선택지 | 2개 |
| Picture Selection 최소 선택지 | 2개 |
| Ranking 선택지 범위 | 2~25개 |
| Address 필드 수 | 6개 |
| ContactInfo 필드 수 | 5개 |
| 허용 파일 확장자 수 | 26가지 |
| Validation logic 기본값 | and |
| Element ID 패턴 | 영문, 숫자, 하이픈, 언더스코어만 허용 |
| OpenText 입력 유형 기본값 | text |
| 글자 수 제한 기본값 | 비활성화 |

## 7. 수용 기준 (Acceptance Criteria)

1. **AC-013-01**: 15가지 질문 유형 모두 생성 및 렌더링 가능해야 한다.
2. **AC-013-02**: Rating의 척도는 number/smiley/star 중 하나, 범위는 3~10이어야 한다.
3. **AC-013-03**: Date의 포맷은 M-d-y, d-M-y, y-M-d 중 하나여야 한다.
4. **AC-013-04**: Multiple Choice(Single/Multi)는 최소 2개의 선택지를 가져야 한다.
5. **AC-013-05**: Ranking은 2~25개의 선택지를 가져야 한다.
6. **AC-013-06**: Address의 각 필드(6개)는 표시/필수/플레이스홀더로 개별 제어 가능해야 한다.
7. **AC-013-07**: ContactInfo의 각 필드(5개)는 표시/필수/플레이스홀더로 개별 제어 가능해야 한다.
8. **AC-013-08**: FileUpload의 허용 확장자는 26가지 허용 확장자 중에서만 선택 가능해야 한다.
9. **AC-013-09**: CTA 유형에서 외부 버튼 활성화 시 버튼 URL과 CTA 버튼 라벨이 필수이다.
10. **AC-013-10**: OpenText의 글자 수 제한이 활성화되면 최소값 또는 최대값 중 하나 이상 지정해야 한다.
11. **AC-013-11**: Element ID는 금지된 ID를 사용할 수 없고, 영문/숫자/하이픈/언더스코어만 허용된다.
12. **AC-013-12**: Validation Rules는 해당 Element 유형에 맞는 규칙만 적용 가능해야 한다.
13. **AC-013-13**: Cal 유형은 Cal 사용자 이름이 필수이다 (최소 1자).
14. **AC-013-14**: Picture Selection은 최소 2개의 이미지 선택지를 가져야 한다.
15. **AC-013-15**: Matrix의 셔플 옵션 기본값은 none이다.
