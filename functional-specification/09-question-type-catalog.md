# 기능 명세서: 질문 유형 카탈로그

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | 1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-009 (질문 유형 카탈로그 요구사항 명세서) |
| FR 범위 | FR-013 |
| 라이선스 | Community |
| 상태 | 초안 |

## 2. 개요

### 2.1 목적

Inquiry 설문 시스템에서 지원하는 15가지 질문(Element) 유형 각각의 스키마, 속성, 유효성 검증 규칙을 상세 정의한다. 본 문서는 설문 작성/렌더링/응답 검증 시 질문 유형별 동작을 구현하기 위한 기능 명세이다.

### 2.2 범위

**포함 범위 (In-scope)**
- 15가지 질문(Element) 유형의 전체 스키마 정의
- Element ID 규칙 및 금지 ID 정의
- 각 유형별 고유 속성과 기본값 정의
- Validation 규칙 시스템 정의
- 유형별 적용 가능한 Validation Rules 매핑

**제외 범위 (Out-of-scope)**
- 설문 편집기 UI 컴포넌트
- Logic/Branching 상세
- 응답 데이터 저장 포맷

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| 설문 작성자 | 적절한 질문 유형을 선택하여 설문 구성 |
| 응답자 | 각 질문 유형의 UI를 통해 응답 입력 |
| 시스템 | 유효성 검증 규칙에 따른 응답 검증 수행 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Element | 설문을 구성하는 개별 질문 항목. 15가지 유형 중 하나의 type을 가짐 |
| Element Type | 질문의 유형을 나타내는 고유 식별 문자열 (예: openText, rating 등) |
| Element ID | Element를 식별하기 위한 고유 문자열. 영문, 숫자, 하이픈, 언더스코어만 허용 |
| Validation Rule | 응답 값에 대한 유효성 검증 규칙. 유형별로 적용 가능한 규칙이 다름 |
| Validation Logic | 복수 Validation Rule의 결합 방식. and(모두 충족) 또는 or(하나 이상 충족) |
| 다국어 문자열 | 다국어 지원을 위한 언어별 텍스트를 포함하는 객체 |
| Storage URL | 시스템 파일 저장소의 리소스 경로 |
| Discriminated Union | type 필드의 값에 따라 서로 다른 구조를 갖는 타입 패턴 |
| NPS | Net Promoter Score. 고객 충성도를 측정하는 0~10 척도의 지표 |
| CTA | Call-to-Action. 사용자에게 특정 행동을 유도하는 버튼 |
| 셔플 (Shuffle) | 선택지의 표시 순서를 무작위로 변경하는 기능 |
| 선택지 (Choice) | 객관식 질문에서 사용자가 선택할 수 있는 개별 항목. 고유 ID와 다국어 레이블로 구성 |
| 서브 필드 (Sub-field) | Address, ContactInfo처럼 복합 구조의 질문에서 개별 입력 필드를 지칭 |

## 3. 시스템 개요

### 3.1 시스템 구성도

```
설문 작성자
    |
    v
[설문 편집기] ---> [Element 생성/수정]
    |                    |
    |                    v
    |              [Element Type 선택]
    |                    |
    |                    v
    |              [유형별 속성 설정]
    |                    |
    |                    v
    |              [Validation Rule 설정]
    |                    |
    v                    v
[설문 데이터 모델] <--- [Element 스키마 검증]
    |
    v
[설문 렌더링 엔진] ---> 응답자
    |
    v
[응답 검증 엔진] ---> [Validation Rule 평가]
```

### 3.2 주요 기능 목록

| 기능 ID | 기능명 | 관련 요구사항 |
|---------|--------|--------------|
| FN-009-01 | Element 공통 속성 관리 | FR-013, 4.2, 4.3 |
| FN-009-02 | OpenText 질문 유형 | FR-013, 4.4 |
| FN-009-03 | MultipleChoiceSingle 질문 유형 | FR-013, 4.5 |
| FN-009-04 | MultipleChoiceMulti 질문 유형 | FR-013, 4.6 |
| FN-009-05 | NPS 질문 유형 | FR-013, 4.7 |
| FN-009-06 | CTA 질문 유형 | FR-013, 4.8 |
| FN-009-07 | Rating 질문 유형 | FR-013, 4.9 |
| FN-009-08 | Consent 질문 유형 | FR-013, 4.10 |
| FN-009-09 | PictureSelection 질문 유형 | FR-013, 4.11 |
| FN-009-10 | Date 질문 유형 | FR-013, 4.12 |
| FN-009-11 | FileUpload 질문 유형 | FR-013, 4.13 |
| FN-009-12 | Cal 질문 유형 | FR-013, 4.14 |
| FN-009-13 | Matrix 질문 유형 | FR-013, 4.15 |
| FN-009-14 | Address 질문 유형 | FR-013, 4.16 |
| FN-009-15 | Ranking 질문 유형 | FR-013, 4.17 |
| FN-009-16 | ContactInfo 질문 유형 | FR-013, 4.18 |
| FN-009-17 | Validation 규칙 시스템 | FR-013, 4.19 |
| FN-009-18 | Shuffle 옵션 | FR-013, 4.20 |

### 3.3 기능 간 관계도

```
[FN-009-01 공통 속성]
    |
    +--- 상속 ---> FN-009-02 ~ FN-009-16 (모든 질문 유형)
    |
    v
[FN-009-17 Validation 규칙 시스템]
    |
    +--- 적용 ---> FN-009-02 (OpenText)
    +--- 적용 ---> FN-009-04 (MultipleChoiceMulti)
    +--- 적용 ---> FN-009-09 (PictureSelection)
    +--- 적용 ---> FN-009-10 (Date)
    +--- 적용 ---> FN-009-11 (FileUpload)
    +--- 적용 ---> FN-009-13 (Matrix)
    +--- 적용 ---> FN-009-14 (Address)
    +--- 적용 ---> FN-009-15 (Ranking)
    +--- 적용 ---> FN-009-16 (ContactInfo)

[FN-009-18 Shuffle 옵션]
    |
    +--- 적용 ---> FN-009-03 (MultipleChoiceSingle)
    +--- 적용 ---> FN-009-04 (MultipleChoiceMulti)
    +--- 적용 ---> FN-009-13 (Matrix)
    +--- 적용 ---> FN-009-15 (Ranking)
```

## 4. 상세 기능 명세

---

### 4.1 Element 공통 속성 관리

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-01 |
| 기능명 | Element 공통 속성 관리 |
| 관련 요구사항 ID | FR-013 (4.2, 4.3) |
| 우선순위 | 필수 |
| 기능 설명 | 모든 질문 유형이 공유하는 기본 속성 스키마와 Element ID 규칙을 정의한다 |

#### 4.1.2 선행 조건

- 설문이 생성되어 있어야 한다
- Element를 추가하려는 사용자가 해당 설문에 대한 편집 권한을 보유해야 한다

#### 4.1.3 후행 조건

- 생성된 Element에 고유 ID가 부여된다
- Element의 공통 속성이 스키마에 따라 저장된다

#### 4.1.4 기본 흐름

1. 시스템이 새 Element 생성 요청을 수신한다
2. 시스템이 Element ID의 유효성을 검증한다
   - 영문, 숫자, 하이픈(`-`), 언더스코어(`_`)만 허용한다
   - 공백을 포함하지 않는다
   - 금지된 ID 목록에 포함되지 않는다
3. 시스템이 Element Type을 15가지 유형 중 하나로 설정한다
4. 시스템이 공통 속성을 저장한다

#### 4.1.5 대안 흐름

- **AF-01**: Element ID가 자동 생성되는 경우, 시스템이 유효한 고유 ID를 자동으로 생성하여 할당한다

#### 4.1.6 예외 흐름

- **EF-01**: Element ID가 금지된 ID 목록에 포함된 경우 -- 시스템이 오류를 반환하고 Element 생성을 중단한다
- **EF-02**: Element ID에 허용되지 않는 문자가 포함된 경우 -- 시스템이 유효성 검증 오류를 반환한다
- **EF-03**: Element ID에 공백이 포함된 경우 -- 시스템이 유효성 검증 오류를 반환한다

#### 4.1.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-01-01 | Element ID가 금지 목록에 포함 | 생성/수정 거부 |
| BR-01-02 | Element ID에 영문/숫자/하이픈/언더스코어 외 문자 포함 | 생성/수정 거부 |
| BR-01-03 | Element ID에 공백 포함 | 생성/수정 거부 |

**금지된 ID 목록** (10개):
`userId`, `source`, `suid`, `end`, `start`, `welcomeCard`, `hidden`, `verifiedEmail`, `multiLanguage`, `embed`

#### 4.1.8 데이터 요구사항

**공통 속성 스키마**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| id | string | 필수 | - | 영문/숫자/하이픈/언더스코어만 허용, 공백 불허, 금지 ID 불가 |
| type | ElementType (enum) | 필수 | - | 15가지 유형 중 하나 |
| headline | LocalizedString | 필수 | - | 빈 문자열 불허 |
| subheader | LocalizedString | 선택 | undefined | - |
| imageUrl | string (Storage URL) | 선택 | undefined | 유효한 Storage URL |
| videoUrl | string (Storage URL) | 선택 | undefined | 유효한 Storage URL |
| required | boolean | 필수 | - | true 또는 false |
| scale | "number" \| "smiley" \| "star" | 선택 | undefined | Rating 유형 전용 |
| range | 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 | 선택 | undefined | Rating 유형 전용 |
| isDraft | boolean | 선택 | undefined | - |

**ElementType enum 값** (15가지):

```
fileUpload | openText | multipleChoiceSingle | multipleChoiceMulti |
nps | cta | rating | consent | pictureSelection | cal |
date | matrix | address | ranking | contactInfo
```

#### 4.1.9 화면/UI 요구사항

해당 없음 (데이터 스키마 정의)

#### 4.1.10 비기능 요구사항

- **타입 안전성**: discriminated union 패턴으로 type 필드에 따라 각 유형별 속성이 엄격하게 검증되어야 한다
- **하위 호환성**: 기존 질문 유형 enum을 유지하되, 새 Element 유형 enum 사용을 권장한다

---

### 4.2 OpenText (자유 텍스트) 질문 유형

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-02 |
| 기능명 | OpenText 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.4) |
| 우선순위 | 필수 |
| 기능 설명 | 사용자로부터 자유 텍스트 형식의 응답을 입력받는 질문 유형. 단문/장문, 입력 유형(text/email/url/number/phone) 선택 및 글자 수 제한 기능을 제공한다 |

#### 4.2.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `openText`로 지정되어야 한다

#### 4.2.3 후행 조건

- OpenText Element가 설문에 추가된다
- 설정된 Validation Rule에 따라 응답 검증이 가능한 상태가 된다

#### 4.2.4 기본 흐름

1. 설문 작성자가 OpenText 유형의 질문을 생성한다
2. 시스템이 기본 속성을 적용한다 (입력 유형: text, 글자 수 제한: 비활성화, AI 인사이트: false)
3. 설문 작성자가 입력 유형(text, email, url, number, phone)을 선택한다
4. 설문 작성자가 플레이스홀더 텍스트를 설정한다 (선택)
5. 설문 작성자가 장문 응답 모드를 활성화/비활성화한다 (선택)
6. 시스템이 Element를 저장한다

**글자 수 제한 설정 흐름**:

7. 설문 작성자가 글자 수 제한을 활성화한다
8. 시스템이 최소 글자 수 및 최대 글자 수 입력 필드를 표시한다
9. 설문 작성자가 최소값 및/또는 최대값을 입력한다 (하나 이상 필수)
10. 시스템이 글자 수 제한 값의 유효성을 검증한다

#### 4.2.5 대안 흐름

- **AF-01**: 입력 유형을 number로 선택한 경우 -- 숫자 전용 Validation Rule(minValue, maxValue, isGreaterThan, isLessThan)이 추가로 적용 가능해진다
- **AF-02**: 글자 수 제한을 비활성화 상태로 유지하는 경우 -- 최소/최대 글자 수 필드를 표시하지 않는다

#### 4.2.6 예외 흐름

- **EF-01**: 글자 수 제한 활성화 시 최소값과 최대값 모두 미입력 -- 시스템이 "최소값 또는 최대값 중 하나 이상을 지정해야 합니다" 오류를 반환한다
- **EF-02**: 최소 글자 수가 음수 또는 0인 경우 -- 시스템이 "양수를 입력해야 합니다" 오류를 반환한다
- **EF-03**: 최대 글자 수가 음수 또는 0인 경우 -- 시스템이 "양수를 입력해야 합니다" 오류를 반환한다
- **EF-04**: 최소 글자 수가 최대 글자 수보다 큰 경우 -- 시스템이 "최소값이 최대값보다 클 수 없습니다" 오류를 반환한다

#### 4.2.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-02-01 | 글자 수 제한 활성화 | 최소값 또는 최대값 중 하나 이상 필수 |
| BR-02-02 | 최소/최대 글자 수 지정 | 양수만 허용 |
| BR-02-03 | 최소/최대 모두 지정 | 최소값 <= 최대값 |
| BR-02-04 | 입력 유형이 number가 아닌 경우 | 숫자 관련 Validation Rule (minValue, maxValue, isGreaterThan, isLessThan) 적용 불가 |

#### 4.2.8 데이터 요구사항

**고유 속성**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| placeholder | LocalizedString | 선택 | undefined | - |
| longAnswer | boolean | 선택 | undefined | true이면 textarea로 렌더링 |
| inputType | "text" \| "email" \| "url" \| "number" \| "phone" | 선택 | "text" | 5가지 값 중 하나 |
| insightsEnabled | boolean | 선택 | false | - |
| charLimitEnabled | boolean | 선택 | false | - |
| minLength | number | 선택 | undefined | 양수, charLimitEnabled=true일 때 유효 |
| maxLength | number | 선택 | undefined | 양수, charLimitEnabled=true일 때 유효 |

**적용 가능한 Validation Rules** (14가지):

| Rule Type | 파라미터 | 조건 |
|-----------|----------|------|
| minLength | 최소 길이 (숫자) | - |
| maxLength | 최대 길이 (숫자) | - |
| pattern | 정규식 패턴 + 플래그(선택) | - |
| email | 없음 (엄격 검증) | - |
| url | 없음 (엄격 검증) | - |
| phone | 없음 (엄격 검증) | - |
| equals | 비교 값 (문자열) | - |
| doesNotEqual | 비교 값 (문자열) | - |
| contains | 포함 값 (문자열) | - |
| doesNotContain | 미포함 값 (문자열) | - |
| minValue | 최솟값 (숫자) | inputType=number일 때만 |
| maxValue | 최댓값 (숫자) | inputType=number일 때만 |
| isGreaterThan | 기준값 초과 (숫자) | inputType=number일 때만 |
| isLessThan | 기준값 미만 (숫자) | inputType=number일 때만 |

#### 4.2.9 화면/UI 요구사항

- inputType에 따라 적절한 HTML input type을 렌더링해야 한다
- longAnswer=true일 경우 `<textarea>` 요소로 렌더링한다
- longAnswer=false이거나 미설정일 경우 `<input>` 요소로 렌더링한다

#### 4.2.10 비기능 요구사항

해당 없음

---

### 4.3 MultipleChoiceSingle (단일 선택) 질문 유형

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-03 |
| 기능명 | MultipleChoiceSingle 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.5) |
| 우선순위 | 필수 |
| 기능 설명 | 복수 선택지 중 하나만 선택할 수 있는 단일 선택 객관식 질문 유형 |

#### 4.3.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `multipleChoiceSingle`로 지정되어야 한다

#### 4.3.3 후행 조건

- MultipleChoiceSingle Element가 설문에 추가된다
- 선택지가 2개 이상 존재하는 상태가 된다

#### 4.3.4 기본 흐름

1. 설문 작성자가 MultipleChoiceSingle 유형의 질문을 생성한다
2. 설문 작성자가 선택지를 2개 이상 추가한다
3. 설문 작성자가 표시 유형(list 또는 dropdown)을 선택한다 (선택)
4. 설문 작성자가 셔플 옵션을 설정한다 (선택)
5. 시스템이 Element를 저장한다

#### 4.3.5 대안 흐름

- **AF-01**: "기타" 선택지를 포함하는 경우 -- 설문 작성자가 "기타" 플레이스홀더 텍스트를 설정한다
- **AF-02**: 셔플 옵션을 exceptLast로 설정한 경우 -- 마지막 선택지("기타" 등)를 고정하고 나머지를 셔플한다

#### 4.3.6 예외 흐름

- **EF-01**: 선택지가 2개 미만인 경우 -- 시스템이 "최소 2개의 선택지가 필요합니다" 오류를 반환한다

#### 4.3.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-03-01 | 선택지 수 | 최소 2개 이상 필수 |
| BR-03-02 | 응답 시 | 선택지 중 정확히 1개만 선택 가능 |

#### 4.3.8 데이터 요구사항

**고유 속성**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| choices | Choice[] | 필수 | - | 최소 2개, 각 Choice는 고유 ID와 다국어 레이블 보유 |
| shuffleOption | "none" \| "all" \| "exceptLast" | 선택 | "none" | 3가지 값 중 하나 |
| otherOptionPlaceholder | LocalizedString | 선택 | undefined | "기타" 선택지 존재 시 사용 |
| displayType | "list" \| "dropdown" | 선택 | "list" | 2가지 값 중 하나 |

**적용 가능한 Validation Rules**: 없음

#### 4.3.9 화면/UI 요구사항

- displayType이 "list"인 경우 라디오 버튼 목록으로 렌더링
- displayType이 "dropdown"인 경우 드롭다운 메뉴로 렌더링

#### 4.3.10 비기능 요구사항

해당 없음

---

### 4.4 MultipleChoiceMulti (복수 선택) 질문 유형

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-04 |
| 기능명 | MultipleChoiceMulti 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.6) |
| 우선순위 | 필수 |
| 기능 설명 | 복수 선택지 중 여러 개를 선택할 수 있는 복수 선택 객관식 질문 유형. MultipleChoiceSingle과 동일한 속성에 선택 수 제한 Validation을 추가로 지원한다 |

#### 4.4.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `multipleChoiceMulti`로 지정되어야 한다

#### 4.4.3 후행 조건

- MultipleChoiceMulti Element가 설문에 추가된다
- 선택지가 2개 이상 존재하는 상태가 된다

#### 4.4.4 기본 흐름

1. 설문 작성자가 MultipleChoiceMulti 유형의 질문을 생성한다
2. 설문 작성자가 선택지를 2개 이상 추가한다
3. 설문 작성자가 표시 유형(list 또는 dropdown)을 선택한다 (선택)
4. 설문 작성자가 셔플 옵션을 설정한다 (선택)
5. 설문 작성자가 선택 수 제한 Validation Rule을 설정한다 (선택)
6. 시스템이 Element를 저장한다

#### 4.4.5 대안 흐름

- MultipleChoiceSingle(FN-009-03)의 대안 흐름과 동일

#### 4.4.6 예외 흐름

- **EF-01**: 선택지가 2개 미만인 경우 -- 시스템이 "최소 2개의 선택지가 필요합니다" 오류를 반환한다

#### 4.4.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-04-01 | 선택지 수 | 최소 2개 이상 필수 |
| BR-04-02 | 응답 시 | 복수 선택 가능 |

#### 4.4.8 데이터 요구사항

**고유 속성**: MultipleChoiceSingle(FN-009-03)과 동일

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| choices | Choice[] | 필수 | - | 최소 2개 |
| shuffleOption | "none" \| "all" \| "exceptLast" | 선택 | "none" | 3가지 값 중 하나 |
| otherOptionPlaceholder | LocalizedString | 선택 | undefined | - |
| displayType | "list" \| "dropdown" | 선택 | "list" | 2가지 값 중 하나 |

**적용 가능한 Validation Rules** (2가지):

| Rule Type | 파라미터 | 유효성 검증 |
|-----------|----------|------------|
| minSelections | 최소 선택 수 (숫자) | 1 이상의 정수 |
| maxSelections | 최대 선택 수 (숫자) | 1 이상의 정수 |

#### 4.4.9 화면/UI 요구사항

- displayType이 "list"인 경우 체크박스 목록으로 렌더링
- displayType이 "dropdown"인 경우 다중 선택 드롭다운 메뉴로 렌더링

#### 4.4.10 비기능 요구사항

해당 없음

---

### 4.5 NPS (Net Promoter Score) 질문 유형

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-05 |
| 기능명 | NPS 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.7) |
| 우선순위 | 필수 |
| 기능 설명 | 0~10 척도의 Net Promoter Score 질문 유형. 색상 코딩으로 Detractor(0-6)/Passive(7-8)/Promoter(9-10)를 시각적으로 구분할 수 있다 |

#### 4.5.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `nps`로 지정되어야 한다

#### 4.5.3 후행 조건

- NPS Element가 설문에 추가된다
- 0~10 범위의 정수값 응답을 수집할 수 있는 상태가 된다

#### 4.5.4 기본 흐름

1. 설문 작성자가 NPS 유형의 질문을 생성한다
2. 시스템이 0~10 척도를 기본으로 설정한다
3. 설문 작성자가 하단 레이블(예: "Not likely")을 설정한다 (선택)
4. 설문 작성자가 상단 레이블(예: "Very likely")을 설정한다 (선택)
5. 설문 작성자가 색상 코딩 활성화 여부를 설정한다 (선택, 기본값: false)
6. 시스템이 Element를 저장한다

#### 4.5.5 대안 흐름

- **AF-01**: 색상 코딩을 활성화한 경우 -- Detractor(0-6)/Passive(7-8)/Promoter(9-10) 구간별 색상을 적용하여 렌더링한다

#### 4.5.6 예외 흐름

해당 없음

#### 4.5.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-05-01 | NPS 척도 | 0~10 고정 (변경 불가) |
| BR-05-02 | 색상 코딩 활성화 시 | Detractor(0-6): 부정, Passive(7-8): 중립, Promoter(9-10): 긍정으로 구분 |

#### 4.5.8 데이터 요구사항

**고유 속성**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| lowerLabel | LocalizedString | 선택 | undefined | - |
| upperLabel | LocalizedString | 선택 | undefined | - |
| isColorCodingEnabled | boolean | 선택 | false | - |

**적용 가능한 Validation Rules**: 없음

#### 4.5.9 화면/UI 요구사항

- 0~10까지 11개의 숫자 버튼을 가로로 배치한다
- 하단/상단 레이블이 설정된 경우 척도 양 끝에 표시한다

#### 4.5.10 비기능 요구사항

해당 없음

---

### 4.6 CTA (Call-to-Action) 질문 유형

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-06 |
| 기능명 | CTA 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.8) |
| 우선순위 | 필수 |
| 기능 설명 | 사용자에게 특정 행동을 유도하는 Call-to-Action 버튼 질문 유형. 설문 내부 동작 또는 외부 URL 링크를 지원한다 |

#### 4.6.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `cta`로 지정되어야 한다

#### 4.6.3 후행 조건

- CTA Element가 설문에 추가된다

#### 4.6.4 기본 흐름

1. 설문 작성자가 CTA 유형의 질문을 생성한다
2. 시스템이 기본값을 적용한다 (외부 버튼: false)
3. 설문 작성자가 CTA 버튼 라벨을 설정한다 (선택)
4. 시스템이 Element를 저장한다

#### 4.6.5 대안 흐름

- **AF-01**: 외부 버튼을 활성화하는 경우
  1. 설문 작성자가 외부 버튼 여부를 true로 설정한다
  2. 시스템이 버튼 URL 입력 필드를 표시한다
  3. 설문 작성자가 유효한 URL을 입력한다
  4. 설문 작성자가 CTA 버튼 라벨을 입력한다 (기본 언어 값 필수)
  5. 시스템이 URL 유효성과 버튼 라벨 존재 여부를 검증한다
  6. 시스템이 Element를 저장한다

#### 4.6.6 예외 흐름

- **EF-01**: 외부 버튼 활성화 상태에서 버튼 URL이 미입력된 경우 -- 시스템이 "버튼 URL은 필수입니다" 오류를 반환한다
- **EF-02**: 외부 버튼 활성화 상태에서 버튼 URL이 유효하지 않은 경우 -- 시스템이 "유효한 URL을 입력해야 합니다" 오류를 반환한다
- **EF-03**: 외부 버튼 활성화 상태에서 CTA 버튼 라벨의 기본 언어 값이 비어 있는 경우 -- 시스템이 "버튼 라벨은 필수입니다" 오류를 반환한다

#### 4.6.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-06-01 | 외부 버튼 활성화 시 | 버튼 URL 필수 |
| BR-06-02 | 외부 버튼 활성화 시 | 버튼 URL은 유효한 URL 형식이어야 함 |
| BR-06-03 | 외부 버튼 활성화 시 | CTA 버튼 라벨의 기본 언어 값이 비어 있으면 안 됨 |

#### 4.6.8 데이터 요구사항

**고유 속성**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| dismissible | boolean | 선택 | false | - |
| buttonUrl | string | 조건부 | undefined | dismissible=true일 때 필수, 유효한 URL |
| buttonLabel | LocalizedString | 조건부 | undefined | dismissible=true일 때 기본 언어 값 필수 |

**적용 가능한 Validation Rules**: 없음

#### 4.6.9 화면/UI 요구사항

- 외부 버튼인 경우: 클릭 시 지정된 URL로 이동
- 내부 버튼인 경우: 클릭 시 설문 내 다음 단계로 진행

#### 4.6.10 비기능 요구사항

해당 없음

---

### 4.7 Rating (평가) 질문 유형

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-07 |
| 기능명 | Rating 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.9) |
| 우선순위 | 필수 |
| 기능 설명 | 숫자/이모지/별 아이콘을 사용한 평가 질문 유형. 3~10 범위의 척도를 지원하며, 색상 코딩 옵션을 제공한다 |

#### 4.7.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `rating`으로 지정되어야 한다

#### 4.7.3 후행 조건

- Rating Element가 설문에 추가된다
- 설정된 척도 범위 내 정수값 응답을 수집할 수 있는 상태가 된다

#### 4.7.4 기본 흐름

1. 설문 작성자가 Rating 유형의 질문을 생성한다
2. 설문 작성자가 척도 유형(number, smiley, star)을 선택한다
3. 설문 작성자가 범위(3~10)를 선택한다
4. 설문 작성자가 하단/상단 레이블을 설정한다 (선택)
5. 설문 작성자가 색상 코딩 활성화 여부를 설정한다 (선택, 기본값: false)
6. 시스템이 Element를 저장한다

#### 4.7.5 대안 흐름

해당 없음

#### 4.7.6 예외 흐름

- **EF-01**: 척도 유형이 number/smiley/star 외 값인 경우 -- 시스템이 유효성 검증 오류를 반환한다
- **EF-02**: 범위가 3~10 외 값인 경우 -- 시스템이 유효성 검증 오류를 반환한다

#### 4.7.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-07-01 | 척도 유형 | number, smiley, star 중 하나만 허용 |
| BR-07-02 | 범위 | 3, 4, 5, 6, 7, 8, 9, 10 중 하나만 허용 (정수) |

#### 4.7.8 데이터 요구사항

**고유 속성**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| scale | "number" \| "smiley" \| "star" | 필수 | - | 3가지 값 중 하나 |
| range | 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 | 필수 | - | 8가지 리터럴 값 중 하나 |
| lowerLabel | LocalizedString | 선택 | undefined | - |
| upperLabel | LocalizedString | 선택 | undefined | - |
| isColorCodingEnabled | boolean | 선택 | false | - |

**적용 가능한 Validation Rules**: 없음

#### 4.7.9 화면/UI 요구사항

- scale에 따라 숫자/이모지/별 아이콘으로 렌더링한다
- range에 따라 해당 개수만큼 선택 항목을 표시한다

#### 4.7.10 비기능 요구사항

해당 없음

---

### 4.8 Consent (동의) 질문 유형

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-08 |
| 기능명 | Consent 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.10) |
| 우선순위 | 필수 |
| 기능 설명 | 사용자에게 동의/비동의를 요청하는 질문 유형 |

#### 4.8.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `consent`로 지정되어야 한다

#### 4.8.3 후행 조건

- Consent Element가 설문에 추가된다
- boolean 형태의 동의/비동의 응답을 수집할 수 있는 상태가 된다

#### 4.8.4 기본 흐름

1. 설문 작성자가 Consent 유형의 질문을 생성한다
2. 설문 작성자가 동의 레이블 텍스트를 입력한다 (필수)
3. 시스템이 Element를 저장한다

#### 4.8.5 대안 흐름

해당 없음

#### 4.8.6 예외 흐름

- **EF-01**: 동의 레이블이 비어 있는 경우 -- 시스템이 "동의 레이블은 필수입니다" 오류를 반환한다

#### 4.8.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-08-01 | 동의 레이블 | 필수값이며 비어 있으면 안 됨 |

#### 4.8.8 데이터 요구사항

**고유 속성**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| label | LocalizedString | 필수 | - | 비어 있으면 안 됨 |

**적용 가능한 Validation Rules**: 없음

#### 4.8.9 화면/UI 요구사항

- 체크박스 또는 토글 형태로 렌더링한다
- 동의 레이블 텍스트를 체크박스 옆에 표시한다

#### 4.8.10 비기능 요구사항

해당 없음

---

### 4.9 PictureSelection (이미지 선택) 질문 유형

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-09 |
| 기능명 | PictureSelection 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.11) |
| 우선순위 | 필수 |
| 기능 설명 | 이미지를 선택지로 제시하여 사용자가 이미지를 선택하는 질문 유형. 단일 또는 복수 선택을 지원한다 |

#### 4.9.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `pictureSelection`으로 지정되어야 한다

#### 4.9.3 후행 조건

- PictureSelection Element가 설문에 추가된다
- 이미지 선택지가 2개 이상 존재하는 상태가 된다

#### 4.9.4 기본 흐름

1. 설문 작성자가 PictureSelection 유형의 질문을 생성한다
2. 설문 작성자가 이미지 선택지를 2개 이상 추가한다 (각 선택지는 고유 ID와 이미지 URL 필수)
3. 설문 작성자가 복수 선택 허용 여부를 설정한다 (기본값: false)
4. 시스템이 Element를 저장한다

#### 4.9.5 대안 흐름

- **AF-01**: 복수 선택을 허용하는 경우 -- minSelections, maxSelections Validation Rule을 추가로 설정할 수 있다

#### 4.9.6 예외 흐름

- **EF-01**: 이미지 선택지가 2개 미만인 경우 -- 시스템이 "최소 2개의 이미지 선택지가 필요합니다" 오류를 반환한다
- **EF-02**: 이미지 선택지에 이미지 URL이 누락된 경우 -- 시스템이 "이미지 URL은 필수입니다" 오류를 반환한다

#### 4.9.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-09-01 | 이미지 선택지 수 | 최소 2개 이상 필수 |
| BR-09-02 | 각 이미지 선택지 | 고유 ID와 이미지 URL 필수 |
| BR-09-03 | 복수 선택 허용=false | 선택지 중 정확히 1개만 선택 가능 |
| BR-09-04 | 복수 선택 허용=true | Validation Rule로 선택 수 제한 가능 |

#### 4.9.8 데이터 요구사항

**고유 속성**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| allowMulti | boolean | 선택 | false | - |
| choices | PictureChoice[] | 필수 | - | 최소 2개 |

**PictureChoice 구조**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| id | string | 필수 | 고유 식별자 |
| imageUrl | string (Storage URL) | 필수 | 유효한 Storage URL |

**적용 가능한 Validation Rules** (2가지, allowMulti=true일 때 동적 적용):

| Rule Type | 파라미터 | 유효성 검증 |
|-----------|----------|------------|
| minSelections | 최소 선택 수 (숫자) | 1 이상의 정수 |
| maxSelections | 최대 선택 수 (숫자) | 1 이상의 정수 |

#### 4.9.9 화면/UI 요구사항

- 이미지를 그리드 형태로 배치한다
- 선택된 이미지에 시각적 강조(테두리, 체크마크 등)를 적용한다

#### 4.9.10 비기능 요구사항

해당 없음

---

### 4.10 Date (날짜 입력) 질문 유형

#### 4.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-10 |
| 기능명 | Date 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.12) |
| 우선순위 | 필수 |
| 기능 설명 | 날짜를 입력받는 질문 유형. 3가지 날짜 포맷(M-d-y, d-M-y, y-M-d)을 지원하며, 날짜 범위 Validation을 제공한다 |

#### 4.10.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `date`로 지정되어야 한다

#### 4.10.3 후행 조건

- Date Element가 설문에 추가된다
- 선택된 날짜 포맷에 따라 날짜 응답을 수집할 수 있는 상태가 된다

#### 4.10.4 기본 흐름

1. 설문 작성자가 Date 유형의 질문을 생성한다
2. 설문 작성자가 날짜 포맷을 선택한다 (M-d-y, d-M-y, y-M-d 중 하나)
3. 설문 작성자가 추가 설명(HTML)을 입력한다 (선택)
4. 설문 작성자가 날짜 범위 Validation Rule을 설정한다 (선택)
5. 시스템이 Element를 저장한다

#### 4.10.5 대안 흐름

해당 없음

#### 4.10.6 예외 흐름

- **EF-01**: 날짜 포맷이 지정된 3가지 외 값인 경우 -- 시스템이 유효성 검증 오류를 반환한다

#### 4.10.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-10-01 | 날짜 포맷 | M-d-y, d-M-y, y-M-d 중 하나만 허용 |

#### 4.10.8 데이터 요구사항

**고유 속성**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| html | LocalizedString | 선택 | undefined | - |
| dateFormat | "M-d-y" \| "d-M-y" \| "y-M-d" | 필수 | - | 3가지 값 중 하나 |

**날짜 포맷 표시 형식**

| 포맷 값 | 표시 형식 | 예시 |
|---------|-----------|------|
| M-d-y | MM-DD-YYYY | 02-21-2026 |
| d-M-y | DD-MM-YYYY | 21-02-2026 |
| y-M-d | YYYY-MM-DD | 2026-02-21 |

**적용 가능한 Validation Rules** (4가지):

| Rule Type | 파라미터 | 유효성 검증 |
|-----------|----------|------------|
| isLaterThan | 기준 날짜 (YYYY-MM-DD 형식 문자열) | 유효한 날짜 |
| isEarlierThan | 기준 날짜 (YYYY-MM-DD 형식 문자열) | 유효한 날짜 |
| isBetween | 시작 날짜, 종료 날짜 (YYYY-MM-DD 형식 문자열) | 시작 날짜 < 종료 날짜 |
| isNotBetween | 시작 날짜, 종료 날짜 (YYYY-MM-DD 형식 문자열) | 시작 날짜 < 종료 날짜 |

#### 4.10.9 화면/UI 요구사항

- 날짜 포맷에 맞는 날짜 선택기(Date Picker)를 렌더링한다
- html이 설정된 경우 추가 설명을 질문 아래에 표시한다

#### 4.10.10 비기능 요구사항

해당 없음

---

### 4.11 FileUpload (파일 업로드) 질문 유형

#### 4.11.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-11 |
| 기능명 | FileUpload 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.13) |
| 우선순위 | 필수 |
| 기능 설명 | 파일을 업로드하는 질문 유형. 단일/복수 파일 업로드, 파일 크기 제한, 허용 확장자 제한을 지원한다 |

#### 4.11.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `fileUpload`로 지정되어야 한다

#### 4.11.3 후행 조건

- FileUpload Element가 설문에 추가된다
- 설정된 제약 조건에 따라 파일 업로드를 수집할 수 있는 상태가 된다

#### 4.11.4 기본 흐름

1. 설문 작성자가 FileUpload 유형의 질문을 생성한다
2. 설문 작성자가 복수 파일 허용 여부를 설정한다
3. 설문 작성자가 최대 파일 크기(MB)를 설정한다 (선택)
4. 설문 작성자가 허용 확장자 목록을 설정한다 (선택)
5. 시스템이 Element를 저장한다

#### 4.11.5 대안 흐름

- **AF-01**: 허용 확장자를 지정하지 않은 경우 -- 26가지 전체 확장자가 허용된다

#### 4.11.6 예외 흐름

- **EF-01**: 허용 확장자 목록에 26가지 외의 확장자가 포함된 경우 -- 시스템이 유효성 검증 오류를 반환한다

#### 4.11.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-11-01 | 허용 확장자 | 26가지 허용 확장자 목록 내에서만 선택 가능 |
| BR-11-02 | 파일 크기 검증 | 클라이언트 사이드에서 최대 크기(MB) 단위로 검증 |

**허용 파일 확장자 목록** (26가지):

| 카테고리 | 확장자 |
|----------|--------|
| 이미지 | heic, png, jpeg, jpg, webp, ico |
| 문서 | pdf, eml, doc, docx, xls, xlsx, ppt, pptx, txt, csv |
| 비디오 | mp4, mov, avi, mkv, webm |
| 오디오 | mp3 |
| 압축 | zip, rar, 7z, tar |

#### 4.11.8 데이터 요구사항

**고유 속성**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| allowMultipleFiles | boolean | 필수 | - | - |
| maxSizeInMB | number | 선택 | undefined | 양수 |
| allowedFileExtensions | string[] | 선택 | undefined | 26가지 허용 확장자 내 |

**적용 가능한 Validation Rules** (2가지):

| Rule Type | 파라미터 | 유효성 검증 |
|-----------|----------|------------|
| fileExtensionIs | 허용 확장자 목록 (string[]) | 1개 이상 |
| fileExtensionIsNot | 차단 확장자 목록 (string[]) | 1개 이상 |

#### 4.11.9 화면/UI 요구사항

- 드래그 앤 드롭 영역과 파일 선택 버튼을 렌더링한다
- 허용된 확장자 정보를 사용자에게 표시한다
- 파일 크기 제한이 설정된 경우 해당 정보를 표시한다

#### 4.11.10 비기능 요구사항

- 파일 크기 검증은 클라이언트 사이드에서 수행한다

---

### 4.12 Cal (일정 예약) 질문 유형

#### 4.12.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-12 |
| 기능명 | Cal 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.14) |
| 우선순위 | 필수 |
| 기능 설명 | Cal.com과 연동하여 일정 예약 기능을 제공하는 질문 유형 |

#### 4.12.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `cal`로 지정되어야 한다

#### 4.12.3 후행 조건

- Cal Element가 설문에 추가된다
- Cal.com 일정 예약 위젯을 렌더링할 수 있는 상태가 된다

#### 4.12.4 기본 흐름

1. 설문 작성자가 Cal 유형의 질문을 생성한다
2. 설문 작성자가 Cal 사용자 이름을 입력한다 (필수, 최소 1자)
3. 설문 작성자가 Cal 호스트 URL을 입력한다 (선택)
4. 시스템이 Element를 저장한다

#### 4.12.5 대안 흐름

해당 없음

#### 4.12.6 예외 흐름

- **EF-01**: Cal 사용자 이름이 비어 있는 경우 -- 시스템이 "Cal 사용자 이름은 필수입니다 (최소 1자)" 오류를 반환한다

#### 4.12.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-12-01 | Cal 사용자 이름 | 최소 1자 이상 필수 |

#### 4.12.8 데이터 요구사항

**고유 속성**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| calUserName | string | 필수 | - | 최소 1자 |
| calHost | string | 선택 | undefined | - |

**적용 가능한 Validation Rules**: 없음

#### 4.12.9 화면/UI 요구사항

- Cal.com 일정 예약 위젯을 임베드하여 렌더링한다

#### 4.12.10 비기능 요구사항

해당 없음

---

### 4.13 Matrix (행렬) 질문 유형

#### 4.13.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-13 |
| 기능명 | Matrix 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.15) |
| 우선순위 | 필수 |
| 기능 설명 | 행과 열로 구성된 행렬(표) 형태의 질문 유형. 각 행에 대해 열 항목 중 하나를 선택하는 방식이다 |

#### 4.13.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `matrix`로 지정되어야 한다

#### 4.13.3 후행 조건

- Matrix Element가 설문에 추가된다
- 행/열 항목에 대한 응답을 수집할 수 있는 상태가 된다

#### 4.13.4 기본 흐름

1. 설문 작성자가 Matrix 유형의 질문을 생성한다
2. 설문 작성자가 행 항목을 추가한다 (각 항목에 고유 ID와 다국어 레이블)
3. 설문 작성자가 열 항목을 추가한다 (각 항목에 고유 ID와 다국어 레이블)
4. 설문 작성자가 셔플 옵션을 설정한다 (선택, 기본값: none)
5. 설문 작성자가 Validation Rule을 설정한다 (선택)
6. 시스템이 Element를 저장한다

#### 4.13.5 대안 흐름

- **AF-01**: 셔플 옵션을 all로 설정한 경우 -- 행 항목 전체가 무작위 순서로 표시된다
- **AF-02**: 셔플 옵션을 exceptLast로 설정한 경우 -- 마지막 행을 제외한 나머지 행이 셔플된다

#### 4.13.6 예외 흐름

해당 없음

#### 4.13.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-13-01 | 셔플 옵션 기본값 | none |

#### 4.13.8 데이터 요구사항

**고유 속성**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| rows | MatrixChoice[] | 필수 | - | 각 항목에 고유 ID, 다국어 레이블 |
| columns | MatrixChoice[] | 필수 | - | 각 항목에 고유 ID, 다국어 레이블 |
| shuffleOption | "none" \| "all" \| "exceptLast" | 선택 | "none" | 3가지 값 중 하나 |

**MatrixChoice 구조**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| id | string | 필수 | 고유 식별자 |
| label | LocalizedString | 필수 | 비어 있으면 안 됨 |

**적용 가능한 Validation Rules** (2가지):

| Rule Type | 파라미터 | 유효성 검증 |
|-----------|----------|------------|
| minRowsAnswered | 최소 응답 행 수 (숫자) | 1 이상의 정수 |
| answerAllRows | 없음 | 모든 행에 응답 필수 |

#### 4.13.9 화면/UI 요구사항

- 행과 열을 테이블 형태로 렌더링한다
- 각 셀에 라디오 버튼을 배치하여 행당 하나의 열을 선택할 수 있도록 한다

#### 4.13.10 비기능 요구사항

해당 없음

---

### 4.14 Address (주소 입력) 질문 유형

#### 4.14.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-14 |
| 기능명 | Address 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.16) |
| 우선순위 | 필수 |
| 기능 설명 | 6개의 주소 서브 필드(주소 라인1, 주소 라인2, 도시, 시/도, 우편번호, 국가)를 개별 제어(표시/필수/플레이스홀더)할 수 있는 주소 입력 질문 유형 |

#### 4.14.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `address`로 지정되어야 한다

#### 4.14.3 후행 조건

- Address Element가 설문에 추가된다
- 활성화된 서브 필드에 대한 응답을 수집할 수 있는 상태가 된다

#### 4.14.4 기본 흐름

1. 설문 작성자가 Address 유형의 질문을 생성한다
2. 설문 작성자가 각 서브 필드(6개)의 표시 여부(show)를 설정한다
3. 설문 작성자가 표시되는 필드의 필수 여부(required)를 설정한다
4. 설문 작성자가 각 필드의 플레이스홀더를 설정한다 (선택)
5. 설문 작성자가 Validation Rule을 설정한다 (선택, field 속성으로 서브 필드 지정)
6. 시스템이 Element를 저장한다

#### 4.14.5 대안 흐름

해당 없음

#### 4.14.6 예외 흐름

해당 없음

#### 4.14.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-14-01 | 서브 필드 6개 | 각 필드를 개별적으로 표시/숨김, 필수/선택 제어 |
| BR-14-02 | Validation Rule 적용 | field 속성으로 특정 서브 필드를 지정하여 규칙 적용 |

#### 4.14.8 데이터 요구사항

**6개 서브 필드 (각 필드별 3가지 제어 속성)**

| 서브 필드 ID | 필드명 | 제어 속성 |
|-------------|--------|-----------|
| addressLine1 | 주소 라인 1 | show (boolean), required (boolean), placeholder (LocalizedString) |
| addressLine2 | 주소 라인 2 | show (boolean), required (boolean), placeholder (LocalizedString) |
| city | 도시 | show (boolean), required (boolean), placeholder (LocalizedString) |
| state | 시/도 | show (boolean), required (boolean), placeholder (LocalizedString) |
| zip | 우편번호 | show (boolean), required (boolean), placeholder (LocalizedString) |
| country | 국가 | show (boolean), required (boolean), placeholder (LocalizedString) |

**적용 가능한 Validation Rules** (10가지):

| Rule Type | 파라미터 | field 옵션 |
|-----------|----------|-----------|
| minLength | 최소 길이 (숫자) | addressLine1, addressLine2, city, state, zip, country |
| maxLength | 최대 길이 (숫자) | addressLine1, addressLine2, city, state, zip, country |
| pattern | 정규식 패턴 + 플래그(선택) | addressLine1, addressLine2, city, state, zip, country |
| email | 없음 (엄격 검증) | addressLine1, addressLine2, city, state, zip, country |
| url | 없음 (엄격 검증) | addressLine1, addressLine2, city, state, zip, country |
| phone | 없음 (엄격 검증) | addressLine1, addressLine2, city, state, zip, country |
| equals | 비교 값 (문자열) | addressLine1, addressLine2, city, state, zip, country |
| doesNotEqual | 비교 값 (문자열) | addressLine1, addressLine2, city, state, zip, country |
| contains | 포함 값 (문자열) | addressLine1, addressLine2, city, state, zip, country |
| doesNotContain | 미포함 값 (문자열) | addressLine1, addressLine2, city, state, zip, country |

#### 4.14.9 화면/UI 요구사항

- show=true인 서브 필드만 렌더링한다
- required=true인 필드에는 필수 표시를 한다
- 각 필드에 설정된 플레이스홀더를 표시한다

#### 4.14.10 비기능 요구사항

해당 없음

---

### 4.15 Ranking (순위 지정) 질문 유형

#### 4.15.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-15 |
| 기능명 | Ranking 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.17) |
| 우선순위 | 필수 |
| 기능 설명 | 드래그 앤 드롭으로 선택지의 순위를 지정하는 질문 유형. 2~25개의 선택지를 지원한다 |

#### 4.15.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `ranking`으로 지정되어야 한다

#### 4.15.3 후행 조건

- Ranking Element가 설문에 추가된다
- 선택지가 2~25개 범위 내로 존재하는 상태가 된다

#### 4.15.4 기본 흐름

1. 설문 작성자가 Ranking 유형의 질문을 생성한다
2. 설문 작성자가 선택지를 2~25개 범위 내로 추가한다
3. 설문 작성자가 셔플 옵션을 설정한다 (선택)
4. 설문 작성자가 Validation Rule을 설정한다 (선택)
5. 시스템이 Element를 저장한다

#### 4.15.5 대안 흐름

- **AF-01**: "기타" 선택지를 포함하는 경우 -- 설문 작성자가 "기타" 플레이스홀더 텍스트를 설정한다

#### 4.15.6 예외 흐름

- **EF-01**: 선택지가 2개 미만인 경우 -- 시스템이 "최소 2개의 선택지가 필요합니다" 오류를 반환한다
- **EF-02**: 선택지가 25개를 초과하는 경우 -- 시스템이 "최대 25개의 선택지만 허용됩니다" 오류를 반환한다

#### 4.15.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-15-01 | 선택지 수 | 최소 2개, 최대 25개 |

#### 4.15.8 데이터 요구사항

**고유 속성**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| choices | Choice[] | 필수 | - | 2~25개 |
| shuffleOption | "none" \| "all" \| "exceptLast" | 선택 | "none" | 3가지 값 중 하나 |
| otherOptionPlaceholder | LocalizedString | 선택 | undefined | - |

**적용 가능한 Validation Rules** (2가지):

| Rule Type | 파라미터 | 유효성 검증 |
|-----------|----------|------------|
| minRanked | 최소 순위 수 (숫자) | 1 이상의 정수 |
| rankAll | 없음 | 모든 항목 순위 지정 필수 |

#### 4.15.9 화면/UI 요구사항

- 드래그 앤 드롭으로 순위를 변경할 수 있는 목록으로 렌더링한다

#### 4.15.10 비기능 요구사항

해당 없음

---

### 4.16 ContactInfo (연락처 정보) 질문 유형

#### 4.16.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-16 |
| 기능명 | ContactInfo 질문 유형 |
| 관련 요구사항 ID | FR-013 (4.18) |
| 우선순위 | 필수 |
| 기능 설명 | 5개의 연락처 서브 필드(이름, 성, 이메일, 전화번호, 회사)를 개별 제어(표시/필수/플레이스홀더)할 수 있는 연락처 정보 입력 질문 유형 |

#### 4.16.2 선행 조건

- Element 공통 속성(FN-009-01)이 유효하게 설정되어 있어야 한다
- type이 `contactInfo`로 지정되어야 한다

#### 4.16.3 후행 조건

- ContactInfo Element가 설문에 추가된다
- 활성화된 서브 필드에 대한 응답을 수집할 수 있는 상태가 된다

#### 4.16.4 기본 흐름

1. 설문 작성자가 ContactInfo 유형의 질문을 생성한다
2. 설문 작성자가 각 서브 필드(5개)의 표시 여부(show)를 설정한다
3. 설문 작성자가 표시되는 필드의 필수 여부(required)를 설정한다
4. 설문 작성자가 각 필드의 플레이스홀더를 설정한다 (선택)
5. 설문 작성자가 Validation Rule을 설정한다 (선택, field 속성으로 서브 필드 지정)
6. 시스템이 Element를 저장한다

#### 4.16.5 대안 흐름

해당 없음

#### 4.16.6 예외 흐름

해당 없음

#### 4.16.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-16-01 | 서브 필드 5개 | 각 필드를 개별적으로 표시/숨김, 필수/선택 제어 |
| BR-16-02 | Validation Rule 적용 | field 속성으로 특정 서브 필드를 지정하여 규칙 적용 |

#### 4.16.8 데이터 요구사항

**5개 서브 필드 (각 필드별 3가지 제어 속성)**

| 서브 필드 ID | 필드명 | 제어 속성 |
|-------------|--------|-----------|
| firstName | 이름 | show (boolean), required (boolean), placeholder (LocalizedString) |
| lastName | 성 | show (boolean), required (boolean), placeholder (LocalizedString) |
| email | 이메일 | show (boolean), required (boolean), placeholder (LocalizedString) |
| phone | 전화번호 | show (boolean), required (boolean), placeholder (LocalizedString) |
| company | 회사 | show (boolean), required (boolean), placeholder (LocalizedString) |

**적용 가능한 Validation Rules** (10가지):

| Rule Type | 파라미터 | field 옵션 |
|-----------|----------|-----------|
| minLength | 최소 길이 (숫자) | firstName, lastName, email, phone, company |
| maxLength | 최대 길이 (숫자) | firstName, lastName, email, phone, company |
| pattern | 정규식 패턴 + 플래그(선택) | firstName, lastName, email, phone, company |
| email | 없음 (엄격 검증) | firstName, lastName, email, phone, company |
| url | 없음 (엄격 검증) | firstName, lastName, email, phone, company |
| phone | 없음 (엄격 검증) | firstName, lastName, email, phone, company |
| equals | 비교 값 (문자열) | firstName, lastName, email, phone, company |
| doesNotEqual | 비교 값 (문자열) | firstName, lastName, email, phone, company |
| contains | 포함 값 (문자열) | firstName, lastName, email, phone, company |
| doesNotContain | 미포함 값 (문자열) | firstName, lastName, email, phone, company |

#### 4.16.9 화면/UI 요구사항

- show=true인 서브 필드만 렌더링한다
- required=true인 필드에는 필수 표시를 한다
- 각 필드에 설정된 플레이스홀더를 표시한다

#### 4.16.10 비기능 요구사항

해당 없음

---

### 4.17 Validation 규칙 시스템

#### 4.17.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-17 |
| 기능명 | Validation 규칙 시스템 |
| 관련 요구사항 ID | FR-013 (4.19) |
| 우선순위 | 필수 |
| 기능 설명 | 각 질문 유형에 대한 응답 값을 검증하는 규칙 시스템. 유형별로 적용 가능한 규칙이 매핑되며, 복수 규칙 결합 시 and/or 논리를 지원한다 |

#### 4.17.2 선행 조건

- Element가 생성되어 있어야 한다
- Element의 type이 Validation Rule을 지원하는 유형이어야 한다

#### 4.17.3 후행 조건

- Validation Rule이 해당 Element에 연결된다
- 응답 시 해당 규칙에 따라 유효성 검증이 수행되는 상태가 된다

#### 4.17.4 기본 흐름

1. 설문 작성자가 Element에 Validation Rule을 추가한다
2. 시스템이 해당 Element Type에 적용 가능한 Rule 목록을 제공한다
3. 설문 작성자가 Rule Type을 선택한다
4. 설문 작성자가 Rule의 파라미터를 입력한다
5. (Address/ContactInfo의 경우) 설문 작성자가 대상 서브 필드를 지정한다
6. 시스템이 Rule을 저장하고 고유 ID를 부여한다

**복수 규칙 설정 흐름**:

7. 설문 작성자가 추가 Rule을 등록한다
8. 설문 작성자가 Validation Logic(and/or)을 설정한다 (기본값: and)

#### 4.17.5 대안 흐름

- **AF-01**: Validation Logic을 or로 설정하는 경우 -- 하나 이상의 규칙을 충족하면 유효하다고 판정한다

#### 4.17.6 예외 흐름

- **EF-01**: Element Type에 적용 불가능한 Rule Type을 추가하려는 경우 -- 시스템이 해당 Rule을 거부한다

#### 4.17.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-17-01 | Validation Logic 기본값 | and (모든 규칙 충족 필수) |
| BR-17-02 | Validation Logic = or | 하나 이상의 규칙 충족 시 유효 |
| BR-17-03 | Rule 적용 | Element Type별 적용 가능한 Rule Type만 허용 |

**유형별 적용 가능한 Validation Rules 매핑**

| Element Type | 적용 가능한 Rules |
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

**Validation이 없는 유형** (6가지): multipleChoiceSingle, nps, cta, rating, consent, cal

#### 4.17.8 데이터 요구사항

**Validation Rule 구조**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| id | string | 필수 | 고유 식별자 |
| type | ValidationRuleType (enum) | 필수 | 24가지 규칙 유형 중 하나 |
| params | object | 조건부 | Rule Type에 따라 다름 |
| field | string | 선택 | Address/ContactInfo 전용, 해당 서브 필드 ID |

**Validation Logic 구조**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| logic | "and" \| "or" | 선택 | "and" | 2가지 값 중 하나 |
| rules | ValidationRule[] | 필수 | - | 1개 이상 |

**전체 Validation Rule Type 목록** (24가지):

| 카테고리 | Rule Type | 파라미터 |
|----------|-----------|----------|
| 텍스트 | minLength | min: number (최소 길이) |
| 텍스트 | maxLength | max: number (최대 길이) |
| 텍스트 | pattern | regex: string, flags?: string |
| 텍스트 | email | 없음 |
| 텍스트 | url | 없음 |
| 텍스트 | phone | 없음 |
| 텍스트 | equals | value: string |
| 텍스트 | doesNotEqual | value: string |
| 텍스트 | contains | value: string |
| 텍스트 | doesNotContain | value: string |
| 숫자 | minValue | min: number |
| 숫자 | maxValue | max: number |
| 숫자 | isGreaterThan | value: number |
| 숫자 | isLessThan | value: number |
| 선택 | minSelections | min: number (1 이상) |
| 선택 | maxSelections | max: number (1 이상) |
| 날짜 | isLaterThan | date: string (YYYY-MM-DD) |
| 날짜 | isEarlierThan | date: string (YYYY-MM-DD) |
| 날짜 | isBetween | startDate: string, endDate: string (YYYY-MM-DD) |
| 날짜 | isNotBetween | startDate: string, endDate: string (YYYY-MM-DD) |
| 순위 | minRanked | min: number (1 이상) |
| 순위 | rankAll | 없음 |
| 행렬 | minRowsAnswered | min: number (1 이상) |
| 행렬 | answerAllRows | 없음 |
| 파일 | fileExtensionIs | extensions: string[] (1개 이상) |
| 파일 | fileExtensionIsNot | extensions: string[] (1개 이상) |

#### 4.17.9 화면/UI 요구사항

해당 없음 (데이터 스키마 정의)

#### 4.17.10 비기능 요구사항

- **확장성**: Validation Rule Type은 enum으로 관리하여 새 규칙 추가가 용이해야 한다

---

### 4.18 Shuffle 옵션

#### 4.18.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009-18 |
| 기능명 | Shuffle 옵션 |
| 관련 요구사항 ID | FR-013 (4.20) |
| 우선순위 | 필수 |
| 기능 설명 | 선택지의 표시 순서를 무작위로 변경하는 기능. multipleChoiceSingle, multipleChoiceMulti, matrix, ranking 유형에 적용된다 |

#### 4.18.2 선행 조건

- Shuffle을 지원하는 Element Type(multipleChoiceSingle, multipleChoiceMulti, matrix, ranking)이어야 한다

#### 4.18.3 후행 조건

- 설정된 셔플 옵션에 따라 응답자에게 선택지가 무작위 순서로 표시된다

#### 4.18.4 기본 흐름

1. 설문 작성자가 셔플 옵션을 설정한다
2. 시스템이 설정값(none, all, exceptLast)을 저장한다
3. 응답자에게 설문을 렌더링할 때 셔플 옵션에 따라 선택지 순서를 결정한다

#### 4.18.5 대안 흐름

해당 없음

#### 4.18.6 예외 흐름

해당 없음

#### 4.18.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-18-01 | shuffleOption = none | 원래 순서대로 표시 (기본) |
| BR-18-02 | shuffleOption = all | 모든 선택지를 무작위 순서로 표시 |
| BR-18-03 | shuffleOption = exceptLast | 마지막 선택지를 고정하고 나머지를 무작위 순서로 표시 |

#### 4.18.8 데이터 요구사항

**Shuffle Option enum**

| 값 | 설명 |
|----|------|
| none | 셔플 없음 (기본) |
| all | 모든 선택지 셔플 |
| exceptLast | 마지막 선택지 제외하고 셔플 |

**적용 유형**: multipleChoiceSingle, multipleChoiceMulti, matrix, ranking

#### 4.18.9 화면/UI 요구사항

해당 없음

#### 4.18.10 비기능 요구사항

해당 없음

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

| 엔티티 | 설명 |
|--------|------|
| Element | 설문을 구성하는 개별 질문 항목 (discriminated union) |
| Choice | 객관식/순위 질문의 선택지 (ID + 다국어 레이블) |
| PictureChoice | 이미지 선택 질문의 선택지 (ID + 이미지 URL) |
| MatrixChoice | 행렬 질문의 행/열 항목 (ID + 다국어 레이블) |
| ValidationRule | 응답 유효성 검증 규칙 (ID + type + params + field) |
| ValidationConfig | Validation 규칙 집합 (logic + rules[]) |
| LocalizedString | 다국어 문자열 (언어 코드별 텍스트) |
| AddressField | 주소 서브 필드 (show + required + placeholder) |
| ContactInfoField | 연락처 서브 필드 (show + required + placeholder) |

### 5.2 엔티티 간 관계

```
Element (1) --- (0..1) ValidationConfig
                          |
                          +--- (1..*) ValidationRule

Element (type=multipleChoiceSingle|multipleChoiceMulti|ranking)
    +--- (2..*) Choice

Element (type=pictureSelection)
    +--- (2..*) PictureChoice

Element (type=matrix)
    +--- (1..*) MatrixChoice [rows]
    +--- (1..*) MatrixChoice [columns]

Element (type=address)
    +--- (6) AddressField

Element (type=contactInfo)
    +--- (5) ContactInfoField
```

### 5.3 데이터 흐름

```
[설문 편집기]
    |
    | 1. Element 생성/수정 요청
    v
[Element 스키마 검증]
    |
    | 2. 공통 속성 + type별 고유 속성 검증
    v
[Validation Rule 검증]
    |
    | 3. Element Type에 적용 가능한 Rule인지 확인
    v
[설문 데이터 저장소]
    |
    | 4. 검증 완료된 Element 저장
    v
[설문 렌더링 엔진]
    |
    | 5. Element Type에 따라 UI 렌더링
    v
[응답 수집]
    |
    | 6. Validation Rule에 따라 응답 검증
    v
[응답 저장소]
```

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 연동 시스템 | 설명 | 관련 Element Type |
|------------|------|------------------|
| Cal.com | 일정 예약 위젯 임베드 | cal |
| Storage | 이미지/비디오/파일 저장소 | fileUpload, pictureSelection, 공통(imageUrl, videoUrl) |

### 6.2 API 명세

해당 문서 범위 외 (Element 스키마 정의에 한정)

## 7. 비기능 요구사항

### 7.1 성능 요구사항

해당 없음 (스키마 정의 문서)

### 7.2 보안 요구사항

해당 없음

### 7.3 가용성 요구사항

해당 없음

### 7.4 기타 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 타입 안전성 | discriminated union 방식으로 Element Type별 엄격한 타입 검증 수행 |
| 하위 호환성 | 기존 질문 유형 enum 유지, 새 Element 유형 enum 사용 권장 |
| 확장성 | Validation Rule Type을 enum으로 관리하여 새 규칙 추가 용이 |
| 클라이언트 검증 | 파일 크기 검증은 클라이언트 사이드에서 최대 크기(MB) 단위로 처리 |

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 제약사항 | 설명 |
|---------|------|
| discriminated union 패턴 | Element type 필드를 기준으로 유형별 타입을 분기 |
| 클라이언트 사이드 파일 크기 검증 | 파일 크기 검증은 서버가 아닌 클라이언트에서 수행 |
| Element ID 패턴 | 영문, 숫자, 하이픈, 언더스코어만 허용 (정규식: `^[a-zA-Z0-9_-]+$`) |

### 8.2 비즈니스 제약사항

| 제약사항 | 값 |
|---------|-----|
| 질문 유형 수 | 15가지 |
| Rating 척도 유형 옵션 | number, smiley, star (3가지) |
| Rating 범위 | 3~10 (8가지 정수 리터럴) |
| Date 포맷 | M-d-y, d-M-y, y-M-d (3가지) |
| Multiple Choice 최소 선택지 | 2개 |
| Picture Selection 최소 선택지 | 2개 |
| Ranking 선택지 범위 | 2~25개 |
| Address 필드 수 | 6개 |
| ContactInfo 필드 수 | 5개 |
| 허용 파일 확장자 수 | 26가지 |
| Validation logic 기본값 | and |
| OpenText 입력 유형 기본값 | text |
| 글자 수 제한 기본값 | 비활성화 (false) |

### 8.3 가정사항

| 가정 | 설명 |
|------|------|
| 다국어 지원 | 모든 텍스트 필드는 LocalizedString 타입으로 다국어를 지원한다고 가정 |
| Storage URL | 이미지/비디오 URL은 시스템 내부 Storage URL 형식을 따른다고 가정 |
| Cal.com 연동 | Cal.com 서비스가 정상 동작 중이라고 가정 |

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 수용 기준 ID | 기능 명세 ID | 설명 |
|------------|-------------|-------------|------|
| FR-013, 4.1 | AC-013-01 | FN-009-01 ~ FN-009-16 | 15가지 질문 유형 모두 생성 및 렌더링 가능 |
| FR-013, 4.2 | - | FN-009-01 | Element 공통 속성 정의 |
| FR-013, 4.3 | AC-013-11 | FN-009-01 | Element ID 규칙 및 금지 ID |
| FR-013, 4.4 | AC-013-10 | FN-009-02 | OpenText 질문 유형 및 글자 수 제한 |
| FR-013, 4.5 | AC-013-04 | FN-009-03 | MultipleChoiceSingle (최소 2개 선택지) |
| FR-013, 4.6 | AC-013-04 | FN-009-04 | MultipleChoiceMulti (최소 2개 선택지) |
| FR-013, 4.7 | - | FN-009-05 | NPS 질문 유형 |
| FR-013, 4.8 | AC-013-09 | FN-009-06 | CTA (외부 버튼 시 URL/라벨 필수) |
| FR-013, 4.9 | AC-013-02 | FN-009-07 | Rating (척도 유형/범위) |
| FR-013, 4.10 | - | FN-009-08 | Consent 질문 유형 |
| FR-013, 4.11 | AC-013-14 | FN-009-09 | PictureSelection (최소 2개 이미지) |
| FR-013, 4.12 | AC-013-03 | FN-009-10 | Date (3가지 포맷) |
| FR-013, 4.13 | AC-013-08 | FN-009-11 | FileUpload (26가지 허용 확장자) |
| FR-013, 4.14 | AC-013-13 | FN-009-12 | Cal (사용자 이름 필수) |
| FR-013, 4.15 | AC-013-15 | FN-009-13 | Matrix (셔플 기본값 none) |
| FR-013, 4.16 | AC-013-06 | FN-009-14 | Address (6개 필드 개별 제어) |
| FR-013, 4.17 | AC-013-05 | FN-009-15 | Ranking (2~25개 선택지) |
| FR-013, 4.18 | AC-013-07 | FN-009-16 | ContactInfo (5개 필드 개별 제어) |
| FR-013, 4.19 | AC-013-12 | FN-009-17 | Validation 규칙 시스템 (유형별 매핑) |
| FR-013, 4.20 | - | FN-009-18 | Shuffle 옵션 |

### 9.2 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-02-21 | - | 초기 작성 |
