# FSD-014 Quota Management i18n Phase 3-B: 15 Locale Translations

## Overview
FSD-014 쿼터 관리 기능의 Phase 3-B로서, 15개 로케일의 translation.json 파일에 quota 관련 번역 키를 추가하였다. 클라이언트 UI에서 쿼터 관리 화면의 모든 사용자 대면 문자열이 i18next를 통해 다국어 지원되도록 한다.

## Changed Files
- `apps/client/src/app/i18n/locales/en-US/translation.json` - 영어(미국) quota 번역 키 추가
- `apps/client/src/app/i18n/locales/ko-KR/translation.json` - 한국어 quota 번역 키 추가
- `apps/client/src/app/i18n/locales/ja-JP/translation.json` - 일본어 quota 번역 키 추가
- `apps/client/src/app/i18n/locales/de-DE/translation.json` - 독일어 quota 번역 키 추가
- `apps/client/src/app/i18n/locales/es-ES/translation.json` - 스페인어 quota 번역 키 추가
- `apps/client/src/app/i18n/locales/fr-FR/translation.json` - 프랑스어 quota 번역 키 추가
- `apps/client/src/app/i18n/locales/hu-HU/translation.json` - 헝가리어 quota 번역 키 추가
- `apps/client/src/app/i18n/locales/nl-NL/translation.json` - 네덜란드어 quota 번역 키 추가
- `apps/client/src/app/i18n/locales/pt-BR/translation.json` - 포르투갈어(브라질) quota 번역 키 추가
- `apps/client/src/app/i18n/locales/pt-PT/translation.json` - 포르투갈어(포르투갈) quota 번역 키 추가
- `apps/client/src/app/i18n/locales/ro-RO/translation.json` - 루마니아어 quota 번역 키 추가
- `apps/client/src/app/i18n/locales/ru-RU/translation.json` - 러시아어 quota 번역 키 추가
- `apps/client/src/app/i18n/locales/sv-SE/translation.json` - 스웨덴어 quota 번역 키 추가
- `apps/client/src/app/i18n/locales/zh-Hans-CN/translation.json` - 중국어 간체 quota 번역 키 추가
- `apps/client/src/app/i18n/locales/zh-Hant-TW/translation.json` - 중국어 번체 quota 번역 키 추가

## Major Changes

### 번역 키 구조
`survey` 네임스페이스 내부에 `quota` 서브키를 추가하였다. 삽입 위치는 `variables` 섹션 뒤, `settings` 섹션 앞이다.

```json
"survey": {
  // ... 기존 키들 ...
  "variables": { ... },
  "quota": {
    "title": "...",
    "add": "...",
    "edit": "...",
    "delete": "...",
    "name_label": "...",
    "name_placeholder": "...",
    "limit_label": "...",
    "limit_placeholder": "...",
    "action_label": "...",
    "action": {
      "endSurvey": "...",
      "continueSurvey": "..."
    },
    "ending_card_label": "...",
    "ending_card_placeholder": "...",
    "count_partial": "...",
    "count_partial_hint": "...",
    "conditions": {
      "title": "...",
      "hint": "..."
    },
    "progress": "{{count}} / {{limit}} ...",
    "status": {
      "active": "...",
      "full": "..."
    },
    "delete_confirm": "...",
    "validation": { ... },
    "success": { ... },
    "errors": { ... }
  },
  "settings": { ... },
  // ... 기존 키들 ...
}
```

### 번역 키 카테고리 (총 50개 키)
- **기본 UI**: title, add, edit, delete (4개)
- **폼 필드**: name_label, name_placeholder, limit_label, limit_placeholder, action_label (5개)
- **액션 옵션**: action.endSurvey, action.continueSurvey (2개)
- **종료 카드**: ending_card_label, ending_card_placeholder (2개)
- **부분 제출**: count_partial, count_partial_hint (2개)
- **조건**: conditions.title, conditions.hint (2개)
- **진행률/상태**: progress, status.active, status.full (3개)
- **삭제 확인**: delete_confirm (1개)
- **유효성 검증**: validation 하위 8개 키 (name_required, name_duplicate, name_pattern, limit_min, limit_integer, action_required, ending_required, max_quotas)
- **성공 메시지**: success 하위 3개 키 (created, updated, deleted)
- **에러 메시지**: errors 하위 4개 키 (create_fail, update_fail, delete_fail, load_fail)

### i18next 보간 변수
- `{{count}}` / `{{limit}}` - 진행률 표시에 사용
- `{{max}}` - 최대 쿼터 수 검증 메시지에 사용

## How to use it

컴포넌트에서 다음과 같이 사용한다:

```tsx
import { useTranslation } from 'react-i18next';

function QuotaPanel() {
  const { t } = useTranslation();

  return (
    <div>
      <h2>{t('survey.quota.title')}</h2>
      <button>{t('survey.quota.add')}</button>
      <p>{t('survey.quota.progress', { count: 45, limit: 100 })}</p>
      <span>{t('survey.quota.validation.max_quotas', { max: 10 })}</span>
    </div>
  );
}
```

## Related Components/Modules
- `packages/survey-builder-config` - 쿼터 스키마 정의 (Phase 1-A)
- `packages/shared` - 쿼터 공유 타입/유틸리티 (Phase 1-B)
- 향후 구현될 쿼터 관리 UI 컴포넌트에서 이 번역 키들을 소비할 예정

## Precautions
- 기존 `survey.hidden_fields.validation.in_use_quota` 키가 이미 각 로케일에 존재하여, 쿼터 조건에서 사용 중인 필드 삭제 방지 메시지는 이미 지원된다.
- 모든 JSON 파일의 유효성 검증(python3 json.load)을 통과하였다.
- 빌드 검증 완료: `pnpm nx build @inquiry/client` 성공.
