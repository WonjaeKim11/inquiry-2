---
title: Server Component Translation
impact: CRITICAL
impactDescription: enables i18n in React Server Components without client-side JS
tags: server-component, useTranslation, async, createInstance
---

## Server Component Translation

Server components in Next.js App Router cannot use React hooks directly. Instead,
we create a new i18next instance per request and expose an async `useTranslation`
function.

### Server-side useTranslation Implementation

```typescript
// app/i18n/index.ts
import { createInstance, i18n, FlatNamespace, KeyPrefix } from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next/initReactI18next";
import { FallbackNs } from "react-i18next";
import { getOptions } from "./settings";

/**
 * Creates a fresh i18next instance for each server request.
 * This avoids shared state between requests in server components.
 */
const initI18next = async (lng: string, ns: string | string[]) => {
  const i18nInstance = createInstance();
  await i18nInstance
    .use(initReactI18next)
    .use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`./locales/${language}/${namespace}.json`)
      )
    )
    .init(getOptions(lng, ns));
  return i18nInstance;
};

/**
 * Async useTranslation for server components.
 * Must be awaited — returns { t, i18n } just like the client hook.
 *
 * @param lng - Language code from URL params
 * @param ns - Namespace or array of namespaces to load
 * @param options - Optional keyPrefix for scoped translations
 */
export async function useTranslation<
  Ns extends FlatNamespace,
  KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined
>(
  lng: string,
  ns?: Ns | Ns[],
  options: { keyPrefix?: KPrefix } = {}
) {
  const i18nextInstance = await initI18next(
    lng,
    ns as string | string[] ?? "translation"
  );
  return {
    t: i18nextInstance.getFixedT(
      lng,
      Array.isArray(ns) ? ns[0] : ns,
      options.keyPrefix
    ),
    i18n: i18nextInstance,
  };
}
```

### Usage in Server Components

**Basic usage:**

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
    <h1>{t("title")}</h1>
  );
}
```

**With namespace:**

```tsx
// app/[lng]/second-page/page.tsx
import { useTranslation } from "../../i18n";

export default async function SecondPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = await params;
  // Load "second-page" namespace instead of default "translation"
  const { t } = await useTranslation(lng, "second-page");

  return (
    <h1>{t("title")}</h1>
  );
}
```

**With multiple namespaces:**

```tsx
const { t } = await useTranslation(lng, ["common", "second-page"]);
// t("common:greeting") or t("second-page:title")
```

**With keyPrefix (scoped translations):**

```tsx
// If translation.json has: { "header": { "title": "Welcome", "subtitle": "..." } }
const { t } = await useTranslation(lng, "translation", {
  keyPrefix: "header",
});
// t("title") -> "Welcome"  (no need for t("header.title"))
```

### Trans Component in Server Components

Server components cannot use the context-based `Trans` component. Use
`TransWithoutContext` instead:

```tsx
// app/[lng]/components/ServerTrans.tsx
import { Trans } from "react-i18next/TransWithoutContext";
import { useTranslation } from "../../i18n";

export default async function ServerTrans({
  lng,
}: {
  lng: string;
}) {
  const { t, i18n } = await useTranslation(lng);

  return (
    <Trans
      i18n={i18n}
      i18nKey="description"
      t={t}
    >
      This is a <strong>server-rendered</strong> translation with{" "}
      <a href="/docs">a link</a>.
    </Trans>
  );
}
```

### Important Notes

- **New instance per request**: `createInstance()` ensures no shared state
  between concurrent requests (unlike client-side singleton)
- **Always async**: Server-side `useTranslation` returns a Promise — always
  `await` it
- **Pass `lng` explicitly**: Server components receive language from URL params,
  not from i18next context
- **Import path**: Use `react-i18next/initReactI18next` (not `react-i18next`)
  to avoid pulling in client-side code
- **No hooks**: Do not use `useTranslation` from `react-i18next` directly in
  server components — it's a React hook and will fail
