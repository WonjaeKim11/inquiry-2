# FSD-015 다국어 설문 i18n 번역 추가

## Overview
다국어 설문(Multi-Language Survey) 기능을 위한 i18n 번역 키를 15개 로케일의 번역 파일에 추가하는 작업입니다. `multilingual` 최상위 키를 각 `translation.json` 파일에 추가하여, 설문에서 다국어를 설정하고 관리하는 UI 문자열을 지원합니다.

## Changed Files
- `apps/client/src/app/i18n/locales/en-US/translation.json` - 영어(미국) 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/ko-KR/translation.json` - 한국어 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/ja-JP/translation.json` - 일본어 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/de-DE/translation.json` - 독일어 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/es-ES/translation.json` - 스페인어 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/fr-FR/translation.json` - 프랑스어 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/hu-HU/translation.json` - 헝가리어 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/nl-NL/translation.json` - 네덜란드어 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/pt-BR/translation.json` - 브라질 포르투갈어 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/pt-PT/translation.json` - 유럽 포르투갈어 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/ro-RO/translation.json` - 루마니아어 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/ru-RU/translation.json` - 러시아어 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/sv-SE/translation.json` - 스웨덴어 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/zh-Hans-CN/translation.json` - 중국어 간체 번역에 multilingual 키 추가
- `apps/client/src/app/i18n/locales/zh-Hant-TW/translation.json` - 중국어 번체 번역에 multilingual 키 추가

## Major Changes

### multilingual 키 구조
각 번역 파일의 마지막 최상위 키(`recall`) 뒤에 `multilingual` 키를 추가했습니다. 구조는 다음과 같습니다:

- **기본 레이블** (27개 키): `title`, `add_language`, `remove_language`, `default_language`, `set_as_default`, `enable_language`, `disable_language`, `language_switch`, `language_switch_hint`, `translation_status`, `translation_complete`, `translation_incomplete`, `translation_missing`, `translate_all`, `auto_translate`, `rtl_detected`, `max_languages`, `language_code`, `language_name`, `native_name`, `search_language`, `no_languages`, `no_results`
- **direction** (중첩): `ltr`, `rtl` - 텍스트 방향 레이블
- **validation** (중첩): `default_required`, `default_must_be_enabled`, `duplicate_language`, `translation_incomplete`, `missing_field` - 유효성 검사 메시지
- **success** (중첩): `language_added`, `language_removed`, `default_changed`, `translations_saved` - 성공 메시지
- **errors** (중첩): `add_fail`, `remove_fail`, `save_fail`, `load_fail`, `license_required` - 오류 메시지

### i18next 보간 변수
다음 보간 변수가 모든 로케일에서 그대로 유지됩니다:
- `{{max}}` - `max_languages` 키에서 최대 언어 수
- `{{field}}` - `validation.missing_field`에서 필드명
- `{{language}}` - `validation.missing_field`에서 언어명

## How to use it
i18next의 `t()` 함수를 통해 접근합니다:

```tsx
// 기본 레이블
t('multilingual.title')           // "다국어" (ko-KR)
t('multilingual.add_language')    // "언어 추가" (ko-KR)

// 보간 변수 사용
t('multilingual.max_languages', { max: 10 }) // "설문당 최대 10개 언어"

// 중첩 키
t('multilingual.direction.ltr')   // "왼쪽에서 오른쪽"
t('multilingual.validation.missing_field', { field: '제목', language: '영어' })
// => "\"영어\"의 \"제목\" 번역이 누락되었습니다."

// 성공/오류 메시지
t('multilingual.success.language_added')  // "언어가 추가되었습니다."
t('multilingual.errors.license_required') // "다국어 기능은 Enterprise 라이선스가 필요합니다."
```

## Related Components/Modules
- `apps/client/src/app/i18n/` - i18n 설정 및 로케일 파일
- 향후 구현될 다국어 설문 설정 UI 컴포넌트에서 이 키들을 사용할 예정

## Precautions
- 기존 번역 키(`auth`, `dashboard`, `organization`, `project`, `member`, `settings`, `apiKey`, `survey`, `logic`, `recall`)는 수정되지 않았습니다
- `multilingual` 키는 항상 JSON 파일의 마지막 최상위 키로 위치합니다
- Python 스크립트를 통해 JSON을 파싱/직렬화했기 때문에 들여쓰기가 2칸 스페이스로 통일되었습니다
