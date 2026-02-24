# FSD-013 i18n Translations for Variables, Hidden Fields, and Recall

## Overview
Added i18n translation keys for the FSD-013 feature (Variables / Hidden Fields / Recall) across all 15 supported locales. This change provides localized UI text for variable validation messages, hidden field validation messages, and the new recall feature namespace, enabling a fully internationalized user experience for these survey builder components.

## Changed Files
- `apps/client/src/app/i18n/locales/en-US/translation.json` - English (US) translations
- `apps/client/src/app/i18n/locales/ko-KR/translation.json` - Korean translations
- `apps/client/src/app/i18n/locales/de-DE/translation.json` - German translations
- `apps/client/src/app/i18n/locales/fr-FR/translation.json` - French translations
- `apps/client/src/app/i18n/locales/es-ES/translation.json` - Spanish translations
- `apps/client/src/app/i18n/locales/pt-BR/translation.json` - Brazilian Portuguese translations
- `apps/client/src/app/i18n/locales/ja-JP/translation.json` - Japanese translations
- `apps/client/src/app/i18n/locales/zh-Hans-CN/translation.json` - Simplified Chinese translations
- `apps/client/src/app/i18n/locales/zh-Hant-TW/translation.json` - Traditional Chinese translations
- `apps/client/src/app/i18n/locales/ru-RU/translation.json` - Russian translations
- `apps/client/src/app/i18n/locales/nl-NL/translation.json` - Dutch translations
- `apps/client/src/app/i18n/locales/pt-PT/translation.json` - Portuguese (Portugal) translations
- `apps/client/src/app/i18n/locales/hu-HU/translation.json` - Hungarian translations
- `apps/client/src/app/i18n/locales/ro-RO/translation.json` - Romanian translations
- `apps/client/src/app/i18n/locales/sv-SE/translation.json` - Swedish translations

## Major Changes

### 1. `survey.variables` section additions
Added after the existing `type_text` key:
- `name_label` - Label for the variable name input
- `name_placeholder` - Placeholder text for the variable name input
- `value_label` - Label for the default value input
- `delete_confirm` - Confirmation dialog text for variable deletion
- `validation.name_pattern` - Error when variable name contains invalid characters
- `validation.name_empty` - Error when variable name is empty
- `validation.name_duplicate` - Error when variable name is already in use
- `validation.id_duplicate` - Error when variable ID is duplicated
- `validation.type_mismatch` - Error when value doesn't match variable type

### 2. `survey.hidden_fields` section additions
Added after the existing `add_field` key:
- `id_placeholder` - Placeholder text for the field ID input
- `delete_field` - Label for the delete field action
- `validation.id_empty` - Error when field ID is empty (with `{{type}}` interpolation)
- `validation.id_duplicate` - Error when ID already exists across questions/fields/variables
- `validation.id_forbidden` - Error when ID uses a forbidden identifier
- `validation.id_spaces` - Error when ID contains spaces
- `validation.id_pattern` - Error when ID contains invalid characters
- `validation.in_use_logic` - Error preventing deletion when used in conditional logic
- `validation.in_use_recall` - Error preventing deletion when used in recall
- `validation.in_use_quota` - Error preventing deletion when used in quota conditions
- `validation.in_use_followup` - Error preventing deletion when used in follow-up

### 3. New top-level `recall` section
Added as a sibling to `logic` section:
- `title` - Section title
- `insert` - Action label for inserting a recall
- `fallback_empty_warning` - Warning when fallback text is empty
- `nested_placeholder` - Placeholder text for nested recall display
- `format.date_ordinal` - Date format with locale-appropriate ordering
- `format.array_separator` - Separator for array values (locale-specific, e.g., "," vs "、")
- `format.truncated` - Template for truncated text display
- `source.variable` - Label for variable source type
- `source.element` - Label for question/element source type
- `source.hiddenField` - Label for hidden field source type

## How to use it

Access the new keys via i18next:

```tsx
// Variable validation
t('survey.variables.name_label')
t('survey.variables.validation.name_pattern')

// Hidden field validation with interpolation
t('survey.hidden_fields.validation.id_empty', { type: 'Field' })
t('survey.hidden_fields.validation.id_duplicate', { type: 'Hidden Field' })

// Recall section
t('recall.title')
t('recall.insert')
t('recall.source.variable')
t('recall.format.date_ordinal', { day: '15', month: 'March', year: '2026' })
```

## Related Components/Modules
- **FSD-012 Conditional Logic Engine** - The `in_use_logic` validation messages reference logic dependencies
- **FSD-009 Question Type Catalog** - The `id_duplicate` validation checks against existing question element IDs
- **Recall module (Phase 1a)** - `code-history/2026-02-24-recall-module-phase-1a.md` - Core recall feature implementation
- **Validators module (Phase 1b)** - `code-history/2026-02-24-validators-module-phase-1b.md` - Validation engine for variables and hidden fields
- **i18n infrastructure** - `apps/client/src/app/i18n/` - The existing i18next setup that loads these translations

## Precautions
- The `{{type}}` interpolation parameter in `hidden_fields.validation` messages must be provided by the calling component to display the correct entity type (e.g., "Field", "Hidden Field")
- Locale-specific formatting differences exist: CJK locales (ja-JP, zh-Hans-CN, zh-Hant-TW, ko-KR) use "、" as `array_separator` instead of ", ", and use year-first date ordinal formats
- Hungarian date format uses the convention `{{year}}. {{month}} {{day}}.` which differs from most other locales
