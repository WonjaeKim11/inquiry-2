---
title: ICU MessageFormat
impact: MEDIUM
impactDescription: enables advanced pluralization, selection, and formatting in translations
tags: icu, messageformat, plural, select, number, date, formatting
---

## ICU MessageFormat

i18next supports ICU MessageFormat via the `i18next-icu` plugin, as well as
built-in formatting using the Intl API. This guide covers both approaches.

### Option A: Built-in i18next Formatting (Recommended)

i18next v21+ has built-in support for number, currency, date, and relative time
formatting via the Intl API. No additional plugin needed.

#### Pluralization

i18next uses CLDR plural rules with key suffixes:

```json
// en/translation.json
{
  "item_one": "{{count}} item",
  "item_other": "{{count}} items",
  "itemWithZero_zero": "No items",
  "itemWithZero_one": "{{count}} item",
  "itemWithZero_other": "{{count}} items"
}
```

```typescript
t("item", { count: 0 });  // "0 items"
t("item", { count: 1 });  // "1 item"
t("item", { count: 5 });  // "5 items"

t("itemWithZero", { count: 0 }); // "No items"
```

**Plural suffixes by language:**

| Language | Suffixes                                        |
| -------- | ----------------------------------------------- |
| English  | `_one`, `_other`                                |
| Korean   | `_other` (Korean has no plural distinction)     |
| Arabic   | `_zero`, `_one`, `_two`, `_few`, `_many`, `_other` |
| Russian  | `_one`, `_few`, `_many`, `_other`               |

**Ordinal plurals:**

```json
{
  "place_ordinal_one": "{{count}}st place",
  "place_ordinal_two": "{{count}}nd place",
  "place_ordinal_few": "{{count}}rd place",
  "place_ordinal_other": "{{count}}th place"
}
```

```typescript
t("place", { count: 1, ordinal: true });  // "1st place"
t("place", { count: 2, ordinal: true });  // "2nd place"
t("place", { count: 3, ordinal: true });  // "3rd place"
t("place", { count: 4, ordinal: true });  // "4th place"
```

#### Number Formatting

```json
{
  "intlNumber": "Some {{val, number}}",
  "intlNumberWithOptions": "Price: {{val, number(minimumFractionDigits: 2)}}",
  "intlCurrency": "Total: {{val, currency(USD)}}"
}
```

```typescript
t("intlNumber", { val: 1000 });
// "Some 1,000"

t("intlNumberWithOptions", { val: 29.9 });
// "Price: 29.90"

t("intlCurrency", { val: 2000 });
// "Total: $2,000.00"
```

#### Date & Time Formatting

```json
{
  "intlDateTime": "On {{val, datetime}}",
  "intlRelativeTime": "Updated {{val, relativetime}}"
}
```

```typescript
t("intlDateTime", { val: new Date(2024, 0, 15) });
// "On 1/15/2024"

t("intlDateTime", {
  val: new Date(2024, 0, 15),
  formatParams: {
    val: {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  },
});
// "On Monday, January 15, 2024"

t("intlRelativeTime", { val: 3 });
// "Updated in 3 days"

t("intlRelativeTime", { val: -1 });
// "Updated 1 day ago"
```

#### List Formatting

```json
{
  "intlList": "Technologies: {{val, list}}"
}
```

```typescript
t("intlList", { val: ["React", "Next.js", "i18next"] });
// "Technologies: React, Next.js, and i18next"
```

### Option B: i18next-icu Plugin

For full ICU MessageFormat syntax, install the dedicated plugin:

```bash
pnpm add i18next-icu
```

#### Configuration

```typescript
import ICU from "i18next-icu";

i18next.use(ICU).init({
  // ... other options
});
```

#### ICU Syntax Examples

**Plural:**

```json
{
  "message": "{count, plural, =0 {No messages} one {# message} other {# messages}}"
}
```

**Select:**

```json
{
  "greeting": "{gender, select, male {He} female {She} other {They}} will respond."
}
```

**Nested plural + select:**

```json
{
  "notification": "{gender, select, male {{count, plural, one {He has # notification} other {He has # notifications}}} female {{count, plural, one {She has # notification} other {She has # notifications}}} other {{count, plural, one {They have # notification} other {They have # notifications}}}}"
}
```

```typescript
t("notification", { gender: "female", count: 3 });
// "She has 3 notifications"
```

### Built-in vs ICU Plugin

| Feature          | Built-in (v21+)          | i18next-icu              |
| ---------------- | ------------------------ | ------------------------ |
| Plurals          | Suffix-based (`_one`)    | Inline (`{count, plural}`) |
| Select           | Context-based            | Inline (`{val, select}`) |
| Number format    | `{{val, number}}`        | `{val, number}`          |
| Date format      | `{{val, datetime}}`      | `{val, date}`            |
| Bundle size      | No extra dependency      | ~40KB (ICU data)         |
| Translator UX    | Simple key/value         | Requires ICU knowledge   |

**Recommendation**: Use built-in formatting for most projects. Only add
`i18next-icu` if translators are already familiar with ICU syntax or if you
need complex nested plural/select combinations in a single string.
