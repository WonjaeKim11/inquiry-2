---
title: Next.js App Router i18n Setup
impact: CRITICAL
impactDescription: foundation for all i18n functionality in the application
tags: setup, nextjs, app-router, i18n, configuration
---

## Next.js App Router i18n Setup

Complete setup sequence for integrating react-i18next with Next.js App Router.
This guide covers dependency installation, configuration, route structure, and
static generation.

### Step 1: Install Dependencies

```bash
pnpm add react-i18next i18next i18next-resources-to-backend accept-language react-cookie i18next-browser-languagedetector
```

| Package                          | Purpose                                    |
| -------------------------------- | ------------------------------------------ |
| `react-i18next`                  | React bindings for i18next                 |
| `i18next`                        | Core i18n framework                        |
| `i18next-resources-to-backend`   | Load translation files as backend          |
| `accept-language`                | Parse Accept-Language header               |
| `react-cookie`                   | Cookie management for language persistence |
| `i18next-browser-languagedetector` | Client-side language detection           |

### Step 2: Create Settings File

Create `app/i18n/settings.ts` with shared configuration used by both server and
client:

```typescript
// app/i18n/settings.ts

export const fallbackLng = "en";
export const languages = [fallbackLng, "ko"];
export const defaultNS = "translation";
export const cookieName = "i18next";

/**
 * Returns i18next init options.
 * Used by both server-side createInstance() and client-side singleton init.
 */
export function getOptions(
  lng = fallbackLng,
  ns: string | string[] = defaultNS
) {
  return {
    // debug: true, // Enable for development debugging
    supportedLngs: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
  };
}
```

### Step 3: Set Up Route Structure

All pages must be nested under the `[lng]` dynamic segment:

```
app/
├── [lng]/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── second-page/
│   │   └── page.tsx
│   └── components/
│       └── Footer/
│           ├── index.tsx          # Server component
│           ├── FooterBase.tsx     # Shared markup
│           └── client.tsx         # Client component wrapper
├── i18n/
│   ├── settings.ts
│   ├── index.ts                   # Server-side useTranslation
│   ├── client.ts                  # Client-side init
│   └── locales/
│       ├── en/
│       │   └── translation.json
│       └── ko/
│           └── translation.json
└── middleware.ts
```

### Step 4: Root Layout with Language Attribute

```tsx
// app/[lng]/layout.tsx
import { dir } from "i18next";
import { languages } from "../i18n/settings";

/**
 * Generate static params for all supported languages.
 * Required for static generation of language-specific pages.
 */
export async function generateStaticParams() {
  return languages.map((lng) => ({ lng }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lng: string }>;
}) {
  const { lng } = await params;

  return (
    <html lang={lng} dir={dir(lng)}>
      <head />
      <body>{children}</body>
    </html>
  );
}
```

**Key points:**
- `dir(lng)` from i18next returns `"rtl"` or `"ltr"` based on language
- `generateStaticParams()` ensures all language variants are pre-rendered
- `params` is a Promise in Next.js 15+ (must be awaited)

### Step 5: Create Translation Files

```json
// app/i18n/locales/en/translation.json
{
  "title": "Hi",
  "description": "This is a multilingual app."
}
```

```json
// app/i18n/locales/ko/translation.json
{
  "title": "안녕하세요",
  "description": "다국어 지원 앱입니다."
}
```

### Step 6: Server Page Example

```tsx
// app/[lng]/page.tsx
import { useTranslation } from "../i18n";

export default async function Page({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = await params;
  const { t } = await useTranslation(lng);

  return (
    <main>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
    </main>
  );
}
```

### Adding a New Language

1. Add language code to `languages` array in `settings.ts`
2. Create locale directory: `app/i18n/locales/{lng}/`
3. Copy translation JSON files and translate values
4. Middleware and routing handle everything else automatically

### Common Mistakes

- **Missing `generateStaticParams`**: Pages won't be statically generated for
  all languages
- **Forgetting `dir(lng)`**: RTL languages (Arabic, Hebrew) will render
  incorrectly
- **Hardcoding language**: Always use the `lng` param from the URL, never
  hardcode
- **Wrong import path**: Server components import from `app/i18n/index.ts`,
  client components from `app/i18n/client.ts`
