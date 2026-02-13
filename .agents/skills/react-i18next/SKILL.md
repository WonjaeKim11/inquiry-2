---
name: react-i18next
description:
  Internationalization guide for Next.js App Router using react-i18next with
  ICU format support. USE WHEN setting up i18n, implementing translations,
  adding multi-language support, or using ICU MessageFormat.
metadata:
  author: i18next
  version: "1.0.0"
---

# react-i18next for Next.js App Router

Complete guide for implementing internationalization (i18n) in Next.js App Router
applications using react-i18next. Covers server components, client components,
middleware-based language detection, and ICU MessageFormat.

## When to Apply

Reference these guidelines when:

- Setting up i18n in a Next.js App Router project
- Implementing translations in server or client components
- Configuring language detection and routing
- Working with ICU MessageFormat (plurals, selects, numbers, dates)
- Using the Trans component for complex JSX translations
- Organizing translation files and namespaces

## Core Dependencies

```bash
pnpm add react-i18next i18next i18next-resources-to-backend accept-language react-cookie i18next-browser-languagedetector
```

## Quick Reference

| Pattern                  | Server Component                           | Client Component                      |
| ------------------------ | ------------------------------------------ | ------------------------------------- |
| Import                   | `app/i18n/index.ts`                        | `app/i18n/client.ts`                  |
| useTranslation           | `await useTranslation(lng, ns)` (async)    | `useTranslation(ns)` (hook)           |
| i18next instance         | `createInstance()` per request             | Singleton (global init)               |
| Trans component          | `TransWithoutContext` from react-i18next   | `Trans` from react-i18next            |
| Language param            | Passed via `params.lng`                    | Synced via `useEffect` + cookie       |
| Resource loading         | `i18next-resources-to-backend`             | `i18next-resources-to-backend`        |

## File Structure

```
app/
├── i18n/
│   ├── settings.ts          # Shared config (languages, fallbackLng, namespaces)
│   ├── index.ts              # Server-side useTranslation (async, per-request)
│   ├── client.ts             # Client-side i18next init (singleton)
│   └── locales/
│       ├── en/
│       │   ├── translation.json
│       │   └── second-page.json
│       └── ko/
│           ├── translation.json
│           └── second-page.json
├── [lng]/
│   ├── layout.tsx            # Root layout with html lang attribute
│   ├── page.tsx              # Server component with translations
│   └── second-page/
│       └── page.tsx
└── middleware.ts             # Language detection & redirect
```

## Configuration Reference

### settings.ts

```typescript
export const fallbackLng = "en";
export const languages = [fallbackLng, "ko"];
export const defaultNS = "translation";
export const cookieName = "i18next";

export function getOptions(
  lng = fallbackLng,
  ns: string | string[] = defaultNS
) {
  return {
    supportedLngs: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
  };
}
```

## Rule Files by Priority

| Priority | Rule File                          | Impact   | Description                              |
| -------- | ---------------------------------- | -------- | ---------------------------------------- |
| 1        | `setup-nextjs-app-router`          | CRITICAL | Full setup sequence for Next.js App Router |
| 2        | `server-component-translation`     | CRITICAL | Server component translation patterns     |
| 3        | `client-component-translation`     | CRITICAL | Client component translation patterns     |
| 4        | `middleware-language-detection`     | HIGH     | Middleware & language detection setup      |
| 5        | `icu-format`                       | MEDIUM   | ICU MessageFormat syntax & usage           |
| 6        | `trans-component`                  | MEDIUM   | Trans component for complex JSX            |
| 7        | `translation-file-organization`    | MEDIUM   | Translation file structure & namespaces    |

## Code Review Checklist

- [ ] All pages under `app/[lng]/` route segment
- [ ] `generateStaticParams()` returns all supported languages
- [ ] `<html lang={lng}>` set in root layout
- [ ] Server components use async `useTranslation(lng, ns)`
- [ ] Client components have `'use client'` directive
- [ ] Client components sync language via `useEffect`
- [ ] Middleware redirects to `/{lng}/...` for unsupported paths
- [ ] Middleware excludes static files and API routes
- [ ] Translation keys use dot notation (`"section.key"`)
- [ ] Plural forms use `_one` / `_other` suffixes
- [ ] No hardcoded strings in components

## External Resources

- [react-i18next docs](https://react.i18next.com/)
- [i18next docs](https://www.i18next.com/)
- [Next.js App Router i18n example](https://github.com/i18next/next-app-dir-i18next-example)
- [ICU MessageFormat spec](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
