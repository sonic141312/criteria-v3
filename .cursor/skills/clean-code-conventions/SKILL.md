---
name: clean-code-conventions
description: Enforce strict code organization, reuse, and structure rules for the criteria-system-v3 project. Apply when writing, editing, or reviewing any source file (backend or frontend). Triggers on file creation, refactoring, function extraction, or any code generation in `src/`.
---

# Clean Code Conventions — criteria-system-v3

These rules are **mandatory** for every code change in this project. They apply to **both backend (NestJS)** and **frontend (React)** unless explicitly noted otherwise.

---

## 1. Code Reuse & File Placement (CRITICAL)

The placement of a piece of code MUST match its reuse scope. There are exactly **three** valid scopes, in order of increasing breadth:

| Scope | Location | When to use |
|-------|----------|-------------|
| **Single file** | Inside the same file as a `private` (non-exported) function | Helper used by 2+ functions inside ONE file only |
| **Module** | `<module>/` folder, e.g. `src/modules/evaluation/mappers/` | Helper used across multiple files inside the same feature/module |
| **Project-wide** | `src/shared/` (backend) or `src/lib/` / `src/shared/` (frontend) | Helper used across 2+ modules |

### Rules
- **Reused inside one module only** → put it in the module folder, NOT in `shared/`.
- **Reused across multiple modules** → put it in `shared/`. Do NOT duplicate it per module.
- **Reused inside one file only** → keep it as a private function in that file.
- **Never** put a single-module helper into `shared/` — that pollutes the global namespace and makes the dependency graph unclear.
- **Never** inline-duplicate logic that already exists in `shared/` or in the module folder. Import it.

### Decision flowchart
```
Is this logic reused in >1 module?
  ├─ YES → src/shared/ (or src/lib/ for frontend)
  └─ NO  → Is it reused in >1 file inside the same module?
              ├─ YES → src/modules/<module>/<subfolder>/ (e.g. mappers/, utils/)
              └─ NO  → private function in the same file
```

---

## 2. Private Function Extraction (Within a File)

Inside a single file, **group consecutive lines that share the same purpose** into a named private function.

### Rules
- **Multiple consecutive lines with a single clear purpose** → extract into a private function with a descriptive name.
- **A single trivial line** (one assignment, one return, one obvious expression) → DO NOT extract. Leaving it inline is more readable.
- The extracted function MUST be declared **below** all public/exported functions in the file (see rule 4 — code ordering).
- Use the same naming convention as the rest of the file (camelCase for TS).
- Do NOT extract if it would only be called once AND would not clarify intent — extraction is for **clarity AND reuse**, not for arbitrary decomposition.

### Example
```typescript
// BAD — three lines doing one job, inlined in a public function
export async function publishVersion(versionId: string) {
  const version = await this.repo.findById(versionId);
  if (!version) throw new NotFoundError();
  const graph = await this.graphRepo.load(versionId);
  const errors = validateGraph(graph);
  if (errors.length > 0) throw new ValidationError(errors);
  // ... more steps
}

// GOOD — clear intent, named steps
export async function publishVersion(versionId: string): Promise<void> {
  const version = await loadVersionOrThrow(versionId);
  await validateVersionGraph(version);
  await transitionToPublished(version);
}

async function loadVersionOrThrow(versionId: string): Promise<EvaluationVersion> {
  const version = await this.repo.findById(versionId);
  if (!version) throw new NotFoundError(`Version ${versionId} not found`);
  return version;
}

async function validateVersionGraph(version: EvaluationVersion): Promise<void> {
  const graph = await this.graphRepo.load(version.id);
  const errors = validateGraph(graph);
  if (errors.length > 0) throw new ValidationError(errors);
}

async function transitionToPublished(version: EvaluationVersion): Promise<void> {
  // ...transactional publish logic...
}
```

---

## 3. No Magic Strings / Magic Numbers

Every string or number with **semantic meaning** MUST be either:
1. A named constant in a `constants.ts` file (module or shared scope per rule 1), OR
2. A typed enum / union literal type, OR
3. A private constant at the top of the file (only if used in one file).

### What counts as "magic"
- ✅ Magic: `'PUBLISHED'`, `'threshold'`, `0.3`, HTTP route `'POST /executions'`, error codes like `'CYCLE_DETECTED'`.
- ❌ NOT magic: `0`, `1` in obvious loops (`for (let i = 0; i < arr.length; i++)`), empty string `''`, `null`/`undefined` sentinels when type-safe.

### Rules
- **Status values** (`DRAFT`, `PUBLISHED`, `ARCHIVED`, `SUCCESS`, `FAILED`, ...) → define as a TypeScript string union type AND export the constants from a shared enum-like object. Use the constants everywhere; never write the raw string.
- **Node types** (`input`, `formula`, `normalize`, ...) → same treatment. They live in `src/shared/plugins/node-types.ts` because they cross module boundaries (plugin registry + execution engine + DB rows).
- **Error codes** (`CYCLE_DETECTED`, `TYPE_MISMATCH`, ...) → exported from `src/shared/errors/error-codes.ts`.
- **Configuration thresholds** (TTL, retry counts, default weights) → constants files, not inline.
- **Route paths** for HTTP clients → constants, not string literals scattered in code.

### Example
```typescript
// BAD
if (version.status === 'PUBLISHED') { ... }
await this.engine.execute(nodeType, inputs, config); // where does 'threshold' come from?

// GOOD
import { EvaluationVersionStatus, PUBLISHED } from 'src/shared/constants/evaluation-status';
if (version.status === PUBLISHED) { ... }

import { NodeType, THRESHOLD } from 'src/shared/plugins/node-types';
await this.engine.execute(THRESHOLD, inputs, config);
```

---

## 4. Code Ordering Inside a File

Every file MUST follow this order, top to bottom:

```
1. Imports (external → internal → relative; grouped, blank line between groups)
2. Type-only imports (separated under `import type`)
3. Module-level constants (if file-private)
4. Public/exported types and interfaces (exported)
5. Public/exported functions and classes (exported)
6. Private (non-exported) helpers — in order of use by the public code above
```

### Rules
- **Public API at the top**, so a reader sees the file's contract immediately.
- **Private helpers at the bottom**, ordered by the order in which the public functions call them (top-down narrative).
- **Constants used by public code** stay near the top (section 3) — they are part of the file's public surface.
- **No forward references to private helpers.** A reader should be able to read top-to-bottom.
- In a class file: constructor and public methods first, then private methods, in call order.

---

## 5. Backend-Specific Rules (NestJS)

- **Folder structure** strictly follows `src/domain/`, `src/application/`, `src/infrastructure/`, `src/modules/<feature>/`, `src/shared/`.
- A module folder (`src/modules/evaluation/`) contains: `controllers/`, `use-cases/`, `dto/`, `mappers/`, `entities/`, `constants/`. Only create subfolders you actually use.
- **Domain layer** has zero NestJS imports — only plain TS types and interfaces.
- **Application layer (use cases)** depends only on domain interfaces, never on TypeORM directly.
- **Infrastructure layer** implements domain repository interfaces; this is where TypeORM (entities, repositories) lives.
- **Controllers** have **zero business logic** — they parse input, call a use case, return output. If a controller exceeds ~30 lines, logic is leaking.
- **Mappers** (DB row ↔ domain entity) live in `src/modules/<feature>/mappers/` because they are module-specific. NEVER in `shared/`.
- **Plugin definitions** live in `src/infrastructure/plugins/<name>/` and self-register via NestJS DI tokens.
- **DI tokens** for repositories are defined once in `src/shared/di-tokens.ts` (or per-module if the repo is module-private).

---

## 6. Frontend-Specific Rules (React + Vite + TS)

- Folder structure: `src/features/<feature>/` for feature modules, `src/components/ui/` for shared UI primitives, `src/lib/` for project-wide helpers, `src/shared/` for cross-feature types/constants.
- **A component is a component** — no business logic in `.tsx`. Logic goes to hooks (`src/features/<feature>/hooks/`) or pure functions (`src/features/<feature>/lib/`).
- **Custom hooks** are the unit of reuse inside a feature. Extract them when 2+ components in the feature need the same stateful logic.
- **React Flow node components** for the Graph Builder live in `src/features/graph-builder/nodes/<node-type>/` — one folder per node type, mirroring the backend plugin structure.
- **API client functions** live in `src/features/<feature>/api.ts` (or split per-resource: `api/<resource>.ts`). They are thin wrappers around `fetch`/axios + TanStack Query hooks.
- **Forms** use React Hook Form; form schemas live next to the form, validation in `schemas.ts`.
- **shadcn/ui components** live in `src/components/ui/` and are **never modified** — wrap them if you need customization.

---

## 7. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files (TS) | kebab-case | `evaluation-version.mapper.ts` |
| Classes | PascalCase | `EvaluationVersionMapper` |
| Functions / variables | camelCase | `publishVersion` |
| Constants (values) | UPPER_SNAKE_CASE | `PUBLISHED_STATUS` |
| Constants (objects/enums) | PascalCase | `NodeType.WeightedAverage` |
| DB tables (TypeORM) | snake_case, plural | `evaluation_versions` |
| DB columns | snake_case | `evaluation_id` |
| React components | PascalCase, file PascalCase | `GraphBuilder.tsx` |
| React hooks | camelCase, prefix `use` | `useGraphAutoSave.ts` |
| Types / interfaces | PascalCase, no `I` prefix | `EvaluationVersion`, not `IEntity` |
| DTOs | PascalCase, suffix `Dto` | `PublishVersionDto` |

---

## 8. Imports

- Use **named imports** unless default export is idiomatic (React components, framework conventions).
- **Absolute imports** via `tsconfig.json` `paths` (e.g. `@modules/...`, `@shared/...`) — no `../../../` chains.
- Order: (1) external libs, (2) internal absolute (`@shared/...`), (3) relative (`./`). Blank line between groups.
- Use `import type` for type-only imports to keep the runtime bundle clean.

---

## 9. What This Skill Does NOT Cover

These rules do **not** override the architectural rules in `docs/rule_engine_prompt.md`. In particular:
- Plugin system, DAG validation, transaction boundaries, domain events, multi-tenancy — all governed by the architecture doc.
- If a code-organization rule conflicts with the architecture doc, the architecture doc wins, and the conflict should be flagged to the user.

---

## Quick Self-Check Before Submitting Code

Before finishing any code change, verify:

- [ ] No logic is duplicated across files → placed in the correct scope (file / module / shared).
- [ ] Multi-line coherent blocks are extracted into named private functions.
- [ ] Trivial single-line code is NOT over-extracted.
- [ ] No magic strings or numbers — all semantic literals are constants.
- [ ] File ordering: imports → constants → types → public → private.
- [ ] Public functions appear before private helpers.
- [ ] Backend: zero business logic in controllers; TypeORM only in infrastructure layer.
- [ ] Frontend: zero business logic in `.tsx`; logic in hooks/lib.
- [ ] No `any`, no `// @ts-ignore`, no commented-out code.