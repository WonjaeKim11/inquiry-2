---
title: Trans Component
impact: MEDIUM
impactDescription: enables rich text translations with embedded React components
tags: trans, jsx, interpolation, components, rich-text
---

## Trans Component

The `Trans` component is used when translations contain embedded React elements
(links, bold text, custom components). For plain text, always prefer `t()`.

### When to Use Trans

| Scenario                           | Use `t()`   | Use `Trans` |
| ---------------------------------- | ----------- | ----------- |
| Plain text                         | Yes         | No          |
| Text with variables                | Yes         | No          |
| Text with `<strong>`, `<em>`, etc. | No          | Yes         |
| Text with `<Link>`, `<a>`          | No          | Yes         |
| Text with custom components        | No          | Yes         |

### Basic Usage

**Translation file:**

```json
{
  "description": "To get started, edit <1>src/App.js</1> and save to reload."
}
```

**Component:**

```tsx
import { Trans } from "react-i18next";

function Intro() {
  return (
    <Trans i18nKey="description">
      To get started, edit <code>src/App.js</code> and save to reload.
    </Trans>
  );
}
// Output: To get started, edit <code>src/App.js</code> and save to reload.
```

### Named Components (Recommended, v11.6.0+)

Use the `components` prop with named tags for clarity:

**Translation file:**

```json
{
  "terms": "I agree to the <link>Terms of Service</link> and <bold>Privacy Policy</bold>."
}
```

**Component:**

```tsx
import { Trans } from "react-i18next";
import Link from "next/link";

function Terms({ lng }: { lng: string }) {
  return (
    <Trans
      i18nKey="terms"
      components={{
        link: <Link href={`/${lng}/terms`} />,
        bold: <strong />,
      }}
    />
  );
}
// Output: I agree to the <a href="/en/terms">Terms of Service</a> and
//         <strong>Privacy Policy</strong>.
```

### Index-Based Components

Components referenced by numeric index in translation strings:

**Translation file:**

```json
{
  "richText": "Click <0>here</0> to read the <1>documentation</1>."
}
```

**Component:**

```tsx
<Trans
  i18nKey="richText"
  components={[
    <Link href="/action" />,
    <em />,
  ]}
/>
```

### Interpolation in Trans

**Translation file:**

```json
{
  "userMessages": "Hello <bold>{{name}}</bold>, you have {{count}} unread messages."
}
```

**Component:**

```tsx
<Trans
  i18nKey="userMessages"
  values={{ name: "John", count: 5 }}
  components={{ bold: <strong /> }}
/>
```

### Pluralization in Trans

**Translation file:**

```json
{
  "items_one": "You have <bold>{{count}}</bold> item in your cart.",
  "items_other": "You have <bold>{{count}}</bold> items in your cart."
}
```

**Component:**

```tsx
<Trans
  i18nKey="items"
  count={cartItems.length}
  components={{ bold: <strong /> }}
/>
```

### Dynamic Lists

Use `i18nIsDynamicList` for lists rendered from data:

```tsx
<Trans i18nKey="shoppingList">
  <ul i18nIsDynamicList>
    {items.map((item) => (
      <li key={item.id}>{item.name}</li>
    ))}
  </ul>
</Trans>
```

### Trans in Server Components

Server components cannot use React context. Use `TransWithoutContext`:

```tsx
import { Trans } from "react-i18next/TransWithoutContext";
import { useTranslation } from "../i18n";

export default async function ServerPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = await params;
  const { t, i18n } = await useTranslation(lng);

  return (
    <Trans
      i18n={i18n}
      i18nKey="description"
      t={t}
      components={{ bold: <strong /> }}
    />
  );
}
```

### Configuration Options

Control Trans behavior in the i18next init config:

```typescript
i18next.init({
  react: {
    // Allow basic HTML tags without mapping (default: true)
    transSupportBasicHtmlNodes: true,

    // Which HTML tags to allow (default shown below)
    transKeepBasicHtmlNodesFor: ["br", "strong", "i", "p", "em"],

    // Wrap text nodes for Google Translate compatibility
    transWrapTextNodes: "", // Set to "span" if needed
  },
});
```

With `transSupportBasicHtmlNodes: true`, these HTML tags work directly in
translation strings without needing a components mapping:

```json
{
  "message": "This is <strong>bold</strong> and <em>italic</em> text."
}
```

```tsx
// No components prop needed for basic HTML
<Trans i18nKey="message" />
```

### Common Mistakes

- **Using Trans for plain text**: Use `t()` instead — Trans adds overhead
- **Forgetting `components` prop**: Without it, JSX tags in translations won't
  render
- **Server component context**: Using `Trans` (not `TransWithoutContext`) in
  server components will fail
- **Mismatched indices**: When using index-based components, the order in the
  array must match the numbers in the translation string
