---
title: Client Component Translation
impact: CRITICAL
impactDescription: enables i18n in interactive client components with language sync
tags: client-component, useTranslation, use-client, cookie, language-sync
---

## Client Component Translation

Client components use a singleton i18next instance initialized once. The language
is synced from the URL parameter via `useEffect` and persisted in a cookie.

### Client-side i18next Initialization

```typescript
// app/i18n/client.ts
"use client";

import i18next, { FlatNamespace, KeyPrefix } from "i18next";
import {
  initReactI18next,
  useTranslation as useTranslationOrg,
  UseTranslationOptions,
  UseTranslationResponse,
  FallbackNs,
} from "react-i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import {
  getOptions,
  languages,
  cookieName,
} from "./settings";

const runsOnServerSide = typeof window === "undefined";

/**
 * Singleton initialization — runs once on client.
 * Uses LanguageDetector to pick up language from path/cookie/navigator.
 * On server side (SSR), preloads all languages.
 */
i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`./locales/${language}/${namespace}.json`)
    )
  )
  .init({
    ...getOptions(),
    lng: undefined, // Let detector decide
    detection: {
      order: ["path", "htmlTag", "cookie", "navigator"],
    },
    preload: runsOnServerSide ? languages : [],
  });

/**
 * Client-side useTranslation wrapper.
 * Syncs the i18next language with the URL lng parameter and
 * persists the choice in a cookie.
 *
 * @param lng - Language code from URL params
 * @param ns - Namespace or array of namespaces
 * @param options - Standard useTranslation options
 */
export function useTranslation<
  Ns extends FlatNamespace,
  KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined
>(
  lng: string,
  ns?: Ns | Ns[],
  options?: UseTranslationOptions<KPrefix>
): UseTranslationResponse<FallbackNs<Ns>, KPrefix> {
  const [cookies, setCookie] = useCookies([cookieName]);
  const ret = useTranslationOrg(ns, options);
  const { i18n } = ret;

  // Track if language is already resolved (for SSR)
  const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);

  // Sync language when URL param changes
  useEffect(() => {
    if (activeLng === i18n.resolvedLanguage) return;
    setActiveLng(i18n.resolvedLanguage);
  }, [activeLng, i18n.resolvedLanguage]);

  useEffect(() => {
    if (!lng || i18n.resolvedLanguage === lng) return;
    i18n.changeLanguage(lng);
  }, [lng, i18n]);

  // Persist language preference in cookie
  useEffect(() => {
    if (cookies[cookieName] === lng) return;
    setCookie(cookieName, lng, { path: "/" });
  }, [lng, cookies, setCookie, cookieName]);

  return ret;
}
```

### Usage in Client Components

**Basic usage:**

```tsx
// app/[lng]/components/Counter.tsx
"use client";

import { useState } from "react";
import { useTranslation } from "../../i18n/client";

export default function Counter({ lng }: { lng: string }) {
  const { t } = useTranslation(lng);
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>{t("counter.label", { count })}</p>
      <button onClick={() => setCount((c) => c + 1)}>
        {t("counter.increment")}
      </button>
    </div>
  );
}
```

**With namespace:**

```tsx
"use client";

import { useTranslation } from "../../i18n/client";

export function Footer({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "footer");

  return (
    <footer>
      <p>{t("copyright")}</p>
    </footer>
  );
}
```

### Passing `lng` from Server to Client

The `lng` parameter must flow from the server page to client components via props:

```tsx
// app/[lng]/page.tsx (Server Component)
import { useTranslation } from "../i18n";
import Counter from "./components/Counter";

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
      {/* Pass lng to client component */}
      <Counter lng={lng} />
    </main>
  );
}
```

### Language Switcher Component

```tsx
// app/[lng]/components/LanguageSwitcher.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { languages } from "../../i18n/settings";
import { useTranslation } from "../../i18n/client";

export function LanguageSwitcher({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "common");
  const pathname = usePathname();

  return (
    <nav>
      {languages
        .filter((l) => lng !== l)
        .map((l) => {
          // Replace the current language segment in the URL
          const newPath = pathname.replace(`/${lng}`, `/${l}`);
          return (
            <Link key={l} href={newPath}>
              {t(`language.${l}`)}
            </Link>
          );
        })}
    </nav>
  );
}
```

### Important Notes

- **`'use client'` required**: Every client component file must start with
  `'use client'`
- **Singleton pattern**: Unlike server-side, the client uses a single shared
  i18next instance
- **`lng: undefined` in init**: Let the language detector determine the initial
  language instead of hardcoding it
- **Language sync via useEffect**: The `useEffect` hook ensures the i18next
  instance matches the URL parameter when navigation happens
- **Cookie persistence**: Language preference is stored in a cookie so the
  middleware can detect it on subsequent requests
- **SSR preload**: `preload: runsOnServerSide ? languages : []` ensures
  translations are available during server-side rendering of client components
