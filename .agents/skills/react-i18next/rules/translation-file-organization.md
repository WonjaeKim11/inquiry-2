---
title: Translation File Organization
impact: MEDIUM
impactDescription: ensures maintainable and scalable translation file structure
tags: namespaces, file-structure, translation-keys, organization
---

## Translation File Organization

Well-organized translation files make it easier to manage translations as the
application grows. This guide covers file structure, namespace strategy, key
naming conventions, and missing translation handling.

### File Structure

```
app/i18n/locales/
├── en/
│   ├── translation.json     # Default namespace (shared/global keys)
│   ├── common.json           # Common UI elements (buttons, labels, errors)
│   ├── auth.json             # Authentication pages
│   ├── dashboard.json        # Dashboard feature
│   └── settings.json         # Settings feature
└── ko/
    ├── translation.json
    ├── common.json
    ├── auth.json
    ├── dashboard.json
    └── settings.json
```

### Namespace Strategy

Namespaces split translations into separate files loaded on demand. Choose a
strategy based on your app structure:

**Per-feature (recommended):**

```
auth.json       → Login, signup, password reset
dashboard.json  → Dashboard-specific content
settings.json   → User settings
common.json     → Shared UI (buttons, form labels, errors)
```

**Per-page:**

```
home.json       → Home page
about.json      → About page
contact.json    → Contact page
```

**Loading namespaces:**

```typescript
// Server component — load specific namespace
const { t } = await useTranslation(lng, "dashboard");

// Multiple namespaces
const { t } = await useTranslation(lng, ["dashboard", "common"]);
t("dashboard:title");
t("common:save");

// Client component
const { t } = useTranslation(lng, "auth");
```

### Key Naming Conventions

Use dot notation for nested keys and descriptive names:

**Good:**

```json
{
  "auth": {
    "login": {
      "title": "Sign In",
      "submit": "Sign In",
      "forgotPassword": "Forgot your password?",
      "error": {
        "invalidEmail": "Please enter a valid email address",
        "wrongPassword": "Incorrect password"
      }
    },
    "signup": {
      "title": "Create Account",
      "submit": "Create Account"
    }
  }
}
```

```typescript
t("auth.login.title");          // "Sign In"
t("auth.login.error.invalidEmail"); // "Please enter a valid email address"
```

**Bad:**

```json
{
  "loginTitle": "Sign In",
  "loginBtn": "Sign In",
  "loginErr1": "Please enter a valid email address"
}
```

### Flat vs Nested Keys

Both formats work. Choose one and be consistent:

**Nested (recommended for readability):**

```json
{
  "header": {
    "nav": {
      "home": "Home",
      "about": "About"
    }
  }
}
```

**Flat (works with `keySeparator: false`):**

```json
{
  "header.nav.home": "Home",
  "header.nav.about": "About"
}
```

### Pluralization Keys

Follow i18next plural suffix conventions:

```json
// en/translation.json
{
  "notification_one": "You have {{count}} notification",
  "notification_other": "You have {{count}} notifications"
}
```

```json
// ko/translation.json — Korean has no plural distinction
{
  "notification_other": "{{count}}개의 알림이 있습니다"
}
```

**With zero form:**

```json
{
  "message_zero": "No new messages",
  "message_one": "{{count}} new message",
  "message_other": "{{count}} new messages"
}
```

### Context-Based Translations

Use context for gender, formality, or other variations:

```json
{
  "greeting_male": "Welcome back, Mr. {{name}}",
  "greeting_female": "Welcome back, Ms. {{name}}",
  "greeting": "Welcome back, {{name}}"
}
```

```typescript
t("greeting", { context: "male", name: "Kim" });
// "Welcome back, Mr. Kim"

t("greeting", { context: "female", name: "Lee" });
// "Welcome back, Ms. Lee"
```

### Missing Translation Handling

Configure how missing translations are handled:

```typescript
// In settings.ts or init config
{
  // Show key name when translation is missing
  // (default: returns key)

  // Debug mode — logs missing keys to console
  debug: process.env.NODE_ENV === "development",

  // Save missing keys (useful with backend)
  saveMissing: process.env.NODE_ENV === "development",
  missingKeyHandler: (lngs, ns, key, fallbackValue) => {
    console.warn(`Missing translation: [${ns}] ${key}`);
  },

  // Fallback behavior
  fallbackLng: "en",
  fallbackNS: "translation",
}
```

### Default Values

Provide defaults inline for new keys:

```typescript
// Returns "Welcome" if key doesn't exist
t("greeting.welcome", "Welcome");

// With interpolation default
t("user.hello", { name: "World", defaultValue: "Hello {{name}}" });
```

### Translation File Checklist

- [ ] Every supported language has the same set of namespace files
- [ ] Keys are consistent across all languages
- [ ] Plural forms match the language's CLDR rules
- [ ] No hardcoded strings remain in components
- [ ] Namespace names match feature/page boundaries
- [ ] Default namespace (`translation.json`) contains only shared keys
- [ ] JSON files are valid (no trailing commas, proper escaping)

### Tips for Large Projects

1. **Use `keyPrefix`** to scope translations within a component:
   ```typescript
   const { t } = await useTranslation(lng, "dashboard", {
     keyPrefix: "stats",
   });
   t("revenue"); // Looks up "dashboard:stats.revenue"
   ```

2. **Lazy-load namespaces** — only load what each page needs:
   ```typescript
   // Page-level namespace loading
   const { t } = await useTranslation(lng, "settings");
   ```

3. **Use TypeScript** for type-safe keys (requires i18next v23+):
   ```typescript
   // See: https://www.i18next.com/overview/typescript
   ```

4. **Automate key extraction** with i18next-parser or i18next-cli to find
   unused and missing keys.
