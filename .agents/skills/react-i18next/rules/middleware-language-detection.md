---
title: Middleware & Language Detection
impact: HIGH
impactDescription: handles automatic language routing and detection for all requests
tags: middleware, language-detection, cookie, accept-language, redirect
---

## Middleware & Language Detection

The Next.js middleware intercepts every request to detect the user's preferred
language and redirect to the appropriate `/{lng}/...` path. Detection order:
cookie > Accept-Language header > fallback language.

### Full Middleware Implementation

```typescript
// middleware.ts (project root)
import { NextResponse, NextRequest } from "next/server";
import acceptLanguage from "accept-language";
import { fallbackLng, languages, cookieName } from "./app/i18n/settings";

// Configure accept-language with supported languages
acceptLanguage.languages(languages);

/**
 * Middleware for language detection and URL redirection.
 *
 * Detection priority:
 * 1. Cookie (returning visitor preference)
 * 2. Accept-Language header (browser preference)
 * 3. Fallback language
 *
 * Redirects requests without a language prefix to /{lng}/...
 */
export function middleware(req: NextRequest) {
  // Skip if the path already contains a supported language
  if (
    req.nextUrl.pathname.indexOf("icon") > -1 ||
    req.nextUrl.pathname.indexOf("chrome") > -1
  ) {
    return NextResponse.next();
  }

  let lng: string | undefined | null;

  // 1. Check cookie for saved language preference
  if (req.cookies.has(cookieName)) {
    lng = acceptLanguage.get(req.cookies.get(cookieName)!.value);
  }

  // 2. Fall back to Accept-Language header
  if (!lng) {
    lng = acceptLanguage.get(req.headers.get("Accept-Language"));
  }

  // 3. Use fallback language
  if (!lng) {
    lng = fallbackLng;
  }

  // Redirect if the path doesn't start with a supported language
  if (
    !languages.some((loc) =>
      req.nextUrl.pathname.startsWith(`/${loc}`)
    ) &&
    !req.nextUrl.pathname.startsWith("/_next")
  ) {
    return NextResponse.redirect(
      new URL(`/${lng}${req.nextUrl.pathname}`, req.url)
    );
  }

  // Update cookie if the URL language differs from the saved preference
  if (req.headers.has("referer")) {
    const refererUrl = new URL(req.headers.get("referer")!);
    const lngInReferer = languages.find((l) =>
      refererUrl.pathname.startsWith(`/${l}`)
    );
    const response = NextResponse.next();
    if (lngInReferer) {
      response.cookies.set(cookieName, lngInReferer);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Match all paths except:
   * - API routes (/api/...)
   * - Next.js internals (/_next/...)
   * - Static files (files with extensions)
   */
  matcher: [
    "/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js|site.webmanifest).*)",
  ],
};
```

### How Language Detection Works

```
Request: GET /about
  ┌─ Cookie "i18next" = "ko" ?
  │   YES → lng = "ko"
  │   NO  ↓
  ├─ Accept-Language: ko-KR,ko;q=0.9,en;q=0.8 ?
  │   YES → lng = "ko" (best match from supported languages)
  │   NO  ↓
  └─ Fallback → lng = "en"

Result: Redirect 307 → /ko/about
```

### Matcher Configuration

The `matcher` pattern excludes paths that should not be redirected:

| Pattern            | Excludes                                |
| ------------------ | --------------------------------------- |
| `api`              | API routes (`/api/...`)                 |
| `_next/static`     | Static assets (JS, CSS bundles)         |
| `_next/image`      | Optimized images                        |
| `assets`           | Public assets folder                    |
| `favicon.ico`      | Favicon                                 |
| `sw.js`            | Service worker                          |
| `site.webmanifest` | PWA manifest                            |

### Cookie Flow

1. **First visit**: Middleware detects language from Accept-Language header,
   redirects to `/{lng}/...`
2. **Client init**: Client-side i18next writes language to `i18next` cookie
3. **Subsequent visits**: Middleware reads cookie first, preserving user's
   explicit choice
4. **Language switch**: User clicks language switcher → navigates to new
   `/{lng}/...` → cookie updates via referer check

### Testing Middleware

```bash
# Test with Accept-Language header
curl -H "Accept-Language: ko-KR,ko;q=0.9" -I http://localhost:3000/about
# Expected: 307 redirect to /ko/about

# Test with cookie
curl -b "i18next=en" -I http://localhost:3000/about
# Expected: 307 redirect to /en/about

# Test with existing language prefix (no redirect)
curl -I http://localhost:3000/en/about
# Expected: 200
```

### Common Mistakes

- **Missing matcher**: Without the matcher, middleware runs on every request
  including static assets, causing performance issues
- **Infinite redirect loop**: Ensure `/_next` paths are excluded from the
  matcher
- **Cookie not set**: Make sure the client-side code in `app/i18n/client.ts`
  sets the cookie on language change
- **acceptLanguage not configured**: Must call `acceptLanguage.languages()`
  before using `acceptLanguage.get()`
