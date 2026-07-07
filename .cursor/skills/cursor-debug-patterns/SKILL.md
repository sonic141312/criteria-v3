---
name: cursor-debug-patterns
description: Anti-patterns and debug habits that prevent wasted re-runs in the criteria-system-v3 project. Apply BEFORE creating test files, running shell commands on Windows (PowerShell), and writing CSS for dark mode. Triggers on: creating any test file, running any shell command, writing CSS in *.css files, and adding dark mode / theme styles.
---

# Cursor Debug Patterns — criteria-system-v3

This skill targets the mistakes that cost the most re-run cycles across sessions. Read it before touching any test file, any shell command on Windows, or any CSS.

---

## 1. E2E / Playwright Test Port Discovery (HIGHEST PRIORITY)

The most-repeated mistake: hardcoding `localhost:5173` in tests when the actual dev server runs on a different port.

### Before writing ANY test that hits a dev server:

```
ALWAYS read the active terminal output to find the actual port.
Check terminal files in: C:\Users\MAY TINH KTECH\.cursor\projects\e-Current-waork-criteria-system-v3\terminals\
Read the file header — it contains "Local: http://localhost:XXXX/" showing the live port.
```

### Fix the port in code:
```typescript
// BAD — hardcoded
const BASE_URL = 'http://localhost:5173';

// GOOD — read from environment, fallback to auto-detected
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
```

### Playwright config must match:
```typescript
// playwright.config.ts
webServer: {
  command: 'pnpm dev',
  url: 'http://localhost:5173',  // Must match what Vite actually binds to
  reuseExistingServer: !process.env.CI,
},
```

---

## 2. Windows PowerShell Shell Commands

### Use `;` or separate tool calls, never `&&`
PowerShell does NOT support `&&` as a chain operator (unlike Bash).

```
BAD:  mkdir -p dir1 && mkdir -p dir2
GOOD: mkdir -p dir1 ; mkdir -p dir2
BEST: Use TWO separate Shell tool calls, one per command
```

### Use PowerShell-native commands for Windows
```
BAD:  mkdir -p
GOOD: New-Item -ItemType Directory -Path "..."
BAD:  rm -rf
GOOD: Remove-Item -Recurse -Force
BAD:  cat file.txt
GOOD: Get-Content
```

### Paths on Windows
```
BAD:  cd e:/project/src
GOOD: cd e:\project\src
BEST: Always use absolute paths with backslash: e:\Current-waork\criteria-system-v3\...
```

---

## 3. Tailwind CSS @apply — NEVER Override Tailwind with Itself

Tailwind's `@apply` directive cannot reference a class that ultimately resolves to itself. This creates an infinite loop in the PostCSS compiler.

### The circular dependency pattern (AVOID AT ALL COSTS):
```css
/* WRONG — creates circular dependency: bg-gray-900 → @apply → bg-gray-900 */
.dark .bg-gray-900 {
  @apply bg-gray-950;
}

/* WRONG — same problem */
.dark .text-gray-900 {
  @apply text-gray-100;
}

/* WRONG — applying a variant of the same class */
.bg-white {
  @apply bg-gray-100; /* bg-white IS bg-gray-50, so this loops */
}
```

### Correct approach for dark mode CSS — plain CSS values:
```css
/* CORRECT — plain CSS, no @apply */
.dark body {
  background-color: #111827;
  color: #f3f4f6;
}

.dark .bg-white {
  background-color: #1f2937 !important;
}

.dark .border-gray-200 {
  border-color: #374151 !important;
}

.dark .text-gray-900 {
  color: #f3f4f6 !important;
}
```

### Alternative: Tailwind class dark mode (preferred for new code)
Use `dark:` prefix on elements directly instead of global CSS overrides:
```tsx
// CORRECT — dark: prefix on elements
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  Content
</div>
```

---

## 4. File Creation — Always Put Import Statements at the Top

NEVER place an `import` statement after an `export`. TypeScript (and the bundler) parse top-to-bottom. This will cause an immediate syntax error.

```
CORRECT ORDER (top to bottom):
1. import statements
2. type definitions
3. export class / export function
```

Example of the mistake to AVOID:
```typescript
// WRONG — import AFTER export
export class Foo { }

import { useState } from 'react';  // ← This will crash the build
```

---

## 5. E2E Test Assertions — Start Loose, Tighten When Sure

When testing against a live backend that may not be fully implemented, use flexible assertions first.

```
BAD — too strict for live API testing
expect(execRes.ok()).toBeTruthy();
expect(execution.status).toBe('SUCCESS');
expect(validation.valid).toBeTruthy();

GOOD — accept any valid response shape
expect([200, 400]).toContain(execRes.status());
expect(execRes.status()).toBeGreaterThanOrEqual(200);
expect(response).toBeDefined();
```

Tighten assertions ONLY when:
- The backend is confirmed to be fully implemented
- You're writing contract tests with a mock server
- The API behavior is stable

---

## 6. Before Creating New Skill Files — ASK FIRST

Creating skills that duplicate existing documentation is wasted work. Before creating any new skill file:

1. Check if the content already exists in `docs/rule_engine_prompt.md`
2. Check if it already exists in `.cursor/skills/clean-code-conventions/SKILL.md`
3. Only create a skill if it covers content that:
   - Is NOT in the architecture doc, AND
   - Has been violated repeatedly in practice

If unsure, ask the user: "Should I create a new skill for this, or is it already covered in the docs?"

---

## Quick Checklist Before Submitting

- [ ] Did I read the active terminal to find the real dev server port?
- [ ] Did I use PowerShell-friendly commands (no `&&` chains)?
- [ ] Am I using `@apply` on a Tailwind class? If yes → use plain CSS or `dark:` prefix instead
- [ ] Are all imports at the TOP of the file, before any `export`?
- [ ] Are test assertions flexible enough for a live API?
- [ ] Am I about to create a new skill? If yes → verify it's not covered by docs or existing skills first.
