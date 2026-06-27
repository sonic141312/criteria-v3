# Software Architecture Specification
## Generic Rule Engine / Evaluation Engine

---

## Goal

Build a production-ready, generic Rule Engine that transforms arbitrary structured input into typed outputs.

The engine is NOT a scoring tool. It is a **data-to-knowledge transformation platform**.

Supported output types include but are not limited to:
- Score (number)
- Decision (APPROVE / REJECT)
- Classification (Tier A / B / C)
- Risk Level (LOW / MEDIUM / HIGH)
- Recommendation (string)

The engine must be **domain-agnostic**. No business logic should exist in the engine core. All domain logic lives in plugins and configuration.

---

## Reference Use Case

> Use this example throughout all diagrams, ERDs, TypeORM entities, and API examples.
> This is for validation only — the engine must not be built specifically for this case.

**Schema:** TikTok Creator

**Fields:**
- `followers` (number)
- `engagement_rate` (percentage)
- `growth_rate` (percentage)
- `country` (string)

**Evaluation:** Creator Quality Score

**Graph:**
```
[Input: followers]      → [Normalize: 0–10]  ─┐
[Input: engagement_rate]                       ├→ [WeightedAverage: 0.3 / 0.5 / 0.2] → [Threshold: < 5 → REJECT] → [Output: score + decision]
[Input: growth_rate]                           ┘
```

**Expected Output:**
```json
{
  "score": 7.4,
  "decision": "APPROVE",
  "trace": { ... }
}
```

---

## Tech Stack

### Backend
- NestJS + TypeScript
- PostgreSQL
- TypeORM
- REST API
- Clean Architecture (domain / application / infrastructure)
- Dependency Injection
- Plugin Architecture

### Frontend
- React + TypeScript + Vite
- React Flow (graph builder)
- React Hook Form
- TanStack Query
- TailwindCSS + shadcn/ui

---

## Multi-tenancy

Every resource belongs to one **Organization**.

Rules:
- `organization_id` must exist on every major table: `Schema`, `Field`, `Evaluation`, `EvaluationVersion`, `Execution`
- Data must be isolated at the database query level — never rely on application-level filtering alone
- Do NOT design a shared-schema multi-tenant model
- Authentication is out of scope, but assume `organization_id` is injected from JWT context

---

## Permission Model

Authentication is out of scope for MVP. However, the architecture must not ignore resource ownership.

Minimum required:
- Every resource (`Schema`, `Evaluation`, `EvaluationVersion`, `Execution`) belongs to one `Organization`
- `organization_id` is always enforced at the query level — never trust application-level filtering alone
- Design must not make it hard to add RBAC later

Future RBAC (out of scope for MVP — design must not block it):
```
Organization
  └── User
        └── Role (OWNER | EDITOR | VIEWER)
              └── Permission (schema:write, evaluation:publish, execution:run, ...)
```

When implementing use cases, assume a `RequestContext` object is injected that carries `organization_id`. Do not hard-wire user resolution into business logic.

---

## Core Concepts (5 only)

```
Schema
  │
  ▼
Field
  │
  ▼
Evaluation  ──── EvaluationVersion
  │                    │
  ▼                    ▼
             Node + Edge (Graph)
                        │
                        ▼
                   Execution
                        │
                        ▼
                     Result
```

**Everything else is metadata or plugin.**

- `AND`, `OR`, `SUM`, `AVG`, `IF`, `Threshold`, `Normalize` → plugins (NodeType)
- `followers`, `engagement_rate` → Fields
- `Quality`, `Trust`, `Popularity` → Nodes with different metadata
- `Score`, `Risk`, `Decision` → Output Nodes with different output types

---

## Concept Definitions

### 1. Schema

Defines the structure of input data for one domain.

Properties:
- `id`
- `organization_id`
- `name`
- `description`
- `created_at`, `updated_at`

One Schema can have multiple Evaluations.

---

### 2. Field

Belongs to one Schema. Represents one input variable.

Properties:
- `id`
- `schema_id`
- `key` (machine-readable, e.g. `engagement_rate`)
- `display_name`
- `description`
- `data_type`: `number | string | boolean | datetime | percentage | array | object`
- `validation` (JSONB — min, max, required, regex, etc.)
- `metadata` (JSONB — unit, tags, etc.)

Design the type system to be **extensible** (e.g. `currency`, `geo`, `vector`, `embedding` in the future).

---

### 3. Evaluation

Represents one named rule graph.

Properties:
- `id`
- `organization_id`
- `schema_id`
- `name`
- `description`
- `created_at`

One Schema → many Evaluations.
One Evaluation → many EvaluationVersions.

---

### 4. EvaluationVersion

Represents one version of a graph. Nodes and edges belong directly to a version via `evaluation_version_id`.

Properties:
- `id`
- `evaluation_id`
- `version_number` (integer, auto-incremented per evaluation)
- `status`: `DRAFT | PUBLISHED | ARCHIVED`
- `published_at`
- `created_at`

Rules:
- **All graph data (nodes + edges) belongs to `EvaluationVersion`, never to `Evaluation`**
- `Evaluation` is a logical grouping only — it has no nodes, no edges, no graph
- Only one version can be `PUBLISHED` at a time per Evaluation
- `PUBLISHED` versions are **immutable** — nodes and edges belonging to a PUBLISHED version must never be modified or deleted
- Execution always references a specific `EvaluationVersion`, never an Evaluation directly
- Editing a DRAFT edits its node/edge rows directly — no new version is created
- Creating a new DRAFT from a PUBLISHED version = deep clone all node rows + edge rows into a new `EvaluationVersion` row
- Do NOT snapshot graph to JSONB on publish — the normalized rows ARE the source of truth at all times

Forbidden pattern — do NOT do this:
```
Evaluation → Nodes   ✗ (nodes have no version, impossible to version correctly)
Evaluation → Edges   ✗
```

Correct pattern:
```
Evaluation → EvaluationVersion → Nodes   ✓
                               → Edges   ✓
```

---

### 5. Node

Everything in the graph is a Node. There is no concept of "metric" or "formula" separate from Node.

**Node has two layers:**

#### NodeDefinition (plugin — registered at boot)
```typescript
interface NodeDefinition {
  type: string           // e.g. "weighted_average"
  version: string
  metadata: {
    displayName: string
    description: string
    category: string     // math | logic | aggregate | io | ai
    icon: string
  }
  inputPorts: Port[]
  outputPorts: Port[]
  configSchema: JSONSchema  // validates config at design time
  capability: {
    pure: boolean          // no side effects?
    cacheable: boolean
    async: boolean
  }
  validate(config): ValidationResult
  execute(inputs, config): NodeResult
  explain(inputs, config, result): string
}

interface Port {
  name: string             // e.g. "dividend", "divisor"
  type: DataType
  required: boolean
  description: string
}
```

#### NodeInstance (stored in DB — per version)
```typescript
{
  id: string
  evaluation_version_id: string   // which version this node belongs to
  node_type: string               // references NodeDefinition.type
  label: string
  config: JSONB                   // validated against NodeDefinition.configSchema
  position_x: number              // UI layout — stored as columns, not nested JSON
  position_y: number
}
```

**Do NOT hardcode node implementations in engine core.**

Node types to implement in Phase 1:
- `input` — reads a Field value
- `formula` — evaluates a math expression (stored as AST)
- `normalize` — maps a range to 0–10 or 0–1
- `weighted_average` — weighted sum of inputs
- `threshold` — if value < X → output decision
- `output` — terminal node, defines final result

---

### 6. Edge

Connects two nodes. Stored separately from nodes.

Properties:
- `id`
- `evaluation_version_id`
- `from_node_id`
- `from_port` (name of output port)
- `to_node_id`
- `to_port` (name of input port)
- `execution_order` (integer, for topological sort)

Rules:
- Do NOT store parent-child relationships inside node rows
- Ports must be named — `A/B` vs `B/A` must be distinguishable

---

### 7. Execution

Represents one runtime evaluation of a graph against input data.

#### `executions` table
- `id`
- `organization_id`
- `evaluation_version_id` (immutable reference)
- `status`: `PENDING | RUNNING | SUCCESS | PARTIAL | FAILED`
- `input_values` (JSONB — field key → value)
- `final_result` (JSONB — output node values only)
- `started_at`, `finished_at`

**Execution never modifies EvaluationVersion.**

#### `execution_node_results` table

Each node execution is stored as a **separate row** — not collapsed into a JSONB blob.

Columns:
- `id`
- `execution_id`
- `node_id`
- `status`: `SUCCESS | ERROR | SKIPPED`
- `value` (JSONB — output value of this node)
- `inputs_received` (JSONB — what this node received from upstream)
- `explanation` (text — from `NodeDefinition.explain()`)
- `warnings` (text[])
- `error` (text — if status = ERROR)
- `duration_ms` (integer)

Why a separate table and not JSONB in `executions`:
- Enables analytics: slowest nodes, most-failing nodes, failure rate per node type
- Enables filtering: `WHERE node_id = X AND status = 'ERROR'`
- Enables aggregation: `AVG(duration_ms) GROUP BY node_id`
- JSONB would make all of the above painful or impossible

#### Execution Error Strategy
- If a non-critical node fails → insert its row with `status = ERROR`, continue execution
- If an Output node fails → mark entire Execution `FAILED`
- Never throw unhandled exceptions — all errors captured into `execution_node_results`
- Execution result always includes `status` + queryable per-node results

---

## Graph Model

The engine must represent EvaluationVersion internally as a **DAG (Directed Acyclic Graph)**.

### Graph Validation (run before publish)

Detect and reject:
- Cycles
- Orphan nodes (not connected to any edge)
- Missing required inputs (port connected but no source)
- Type mismatches between ports (e.g. `string` → `Average` node)
- No Output node
- Unreachable Output node

Validation must return structured errors per node, not just a boolean.

```typescript
interface ValidationResult {
  valid: boolean
  errors: Array<{
    node_id?: string
    edge_id?: string
    code: string      // e.g. "CYCLE_DETECTED", "TYPE_MISMATCH"
    message: string
  }>
}
```

---

## Type System

Each Port declares its accepted type. Engine validates connections at design time.

| Node | Input Types | Output Type |
|------|------------|-------------|
| Average | number[] | number |
| AND | boolean, boolean | boolean |
| GreaterThan | number, number | boolean |
| Normalize | number | number |
| Threshold | number | boolean \| string |

Supported base types: `number`, `string`, `boolean`, `datetime`, `percentage`, `array`, `object`

Type checking happens at **graph validation time**, not execution time.

---

## Formula Node — AST

Formula Node must NOT store raw expression strings like `"a + b * c"`.

Parse to AST on save:
```json
{
  "type": "BinaryOp",
  "op": "+",
  "left": { "type": "Variable", "name": "a" },
  "right": {
    "type": "BinaryOp",
    "op": "*",
    "left": { "type": "Variable", "name": "b" },
    "right": { "type": "Variable", "name": "c" }
  }
}
```

Benefits: validate before save, optimize execution, support debugging.

---

## Plugin System

Engine core must have **zero knowledge** of specific node implementations.

No `if (type === 'threshold')`. No `switch(type)`. Ever.

### NodeRegistry — the only entry point

The engine interacts with nodes exclusively through a `NodeRegistry`. The registry is the only component that knows what node types exist.

```typescript
interface NodeRegistry {
  register(definition: NodeDefinition): void
  discover(): NodeDefinition[]
  get(type: string): NodeDefinition
  execute(type: string, inputs: PortValues, config: unknown): NodeResult
}
```

Engine execution flow:
```
Engine receives node row (node_type: "weighted_average", config: {...})
  ↓
Engine calls: registry.get("weighted_average")
  ↓
Engine calls: definition.execute(inputs, config)
  ↓
Engine never touches WeightedAverageNode directly
```

Engine core only depends on `NodeRegistry` interface — never on any concrete plugin.

### Plugin Registration

Plugins self-register at boot via NestJS DI:

```
src/
  plugins/
    core/
      input.plugin.ts
      formula.plugin.ts
      normalize.plugin.ts
      weighted-average.plugin.ts
      threshold.plugin.ts
      output.plugin.ts
    extensions/
      ai.plugin.ts       (Phase 2)
      regex.plugin.ts    (Phase 2)
      http.plugin.ts     (Phase 2)
```

### Plugin Manifest (each plugin self-describes)

```yaml
name: Weighted Average
type: weighted_average
version: 1.0.0
category: aggregate
inputs:
  - name: values
    type: number[]
output:
  type: number
configSchema:
  weights:
    type: array
    items: number
description: Computes weighted average. Weights must sum to 1.
```

UI uses manifest to auto-render configuration forms. Engine uses registry to validate and execute. No hardcoding anywhere.

---

## Domain Events

Domain events represent meaningful things that happened in the business domain. They are emitted by the domain layer and consumed by infrastructure (audit log, notifications, analytics).

Domain events are distinct from infrastructure/execution events — they represent **business facts**, not technical steps.

| Event | Emitted when | Payload |
|-------|-------------|---------|
| `SchemaCreated` | A new schema is created | schema_id, organization_id, name |
| `SchemaDeleted` | A schema is soft-deleted | schema_id, organization_id |
| `EvaluationPublished` | A version is published | evaluation_id, version_id, version_number |
| `EvaluationArchived` | A version is archived | evaluation_id, version_id |
| `ExecutionCompleted` | An execution finishes with SUCCESS or PARTIAL | execution_id, status, duration_ms |
| `ExecutionFailed` | An execution finishes with FAILED | execution_id, error |
| `PluginRegistered` | A new node plugin is loaded at boot | plugin_type, version |

Rules:
- Domain events are emitted **after** a transaction commits — never inside the transaction
- Domain events must not carry mutable references — only IDs and scalar values
- Infrastructure subscribes to domain events; domain layer never depends on infrastructure

---

## Event System (Infrastructure)

Infrastructure events track the internal execution lifecycle. They are emitted by the execution engine, not the domain layer.

```
ExecutionStarted
  → NodeStarted(node_id)
    → NodeFinished(node_id, status, duration_ms)
  → NodeStarted(node_id)
    ...
ExecutionFinished(status, final_result)
ExecutionFailed(error)
```

Use cases: real-time logging, metrics, WebSocket push, retry logic — all without modifying engine core.

---

## Explainability

Every node execution produces a human-readable explanation.

Example trace for final output:
```
Final Score: 7.4
  └─ WeightedAverage: (3.0 × 0.3) + (4.2 × 0.5) + (2.8 × 0.2) = 3.69
       ├─ Normalize(followers=1.2M): mapped 1.2M → 3.0 using range [0, 5M]
       ├─ Input(engagement_rate): 4.2 (raw)
       └─ Input(growth_rate): 2.8 (raw)
  └─ Threshold: 7.4 ≥ 5 → APPROVE
```

API must expose full trace per Execution.

---

## Database Design

### Constraints

- No EAV tables for field values or node properties
- Nodes and edges are fully normalized rows — never stored as JSONB blobs
- `execution_node_results` is a normalized table — one row per node per execution (NOT JSONB in executions)
- `value` and `inputs_received` in `execution_node_results` stored as JSONB (acceptable — unstructured runtime data per node)
- `config` on each node row stored as JSONB (acceptable — it is unstructured plugin config, validated at application layer)
- Immutability of PUBLISHED versions enforced at application layer: never issue UPDATE/DELETE on nodes or edges belonging to a PUBLISHED version
- Creating a new DRAFT = deep clone node rows + edge rows with new `evaluation_version_id`
- All timestamps UTC
- Soft delete on: `schemas`, `evaluations`, `evaluation_versions`
- Hard delete on: `executions` (append-only, purged by retention policy)
- `organization_id` on every major table — enforced at query level

### Tables to design (minimum)
- `organizations`
- `schemas`
- `fields`
- `evaluations`
- `evaluation_versions`
- `nodes` — each row has `evaluation_version_id`; cloned when creating a new DRAFT
- `edges` — each row has `evaluation_version_id`; cloned when creating a new DRAFT
- `executions`
- `execution_node_results` — one row per node per execution; enables analytics and audit

---

## Transaction Boundaries

Every write operation that affects multiple tables must execute inside a **single TypeORM transaction**.

Critical operations and their transaction scope:

| Operation | Tables touched inside transaction |
|-----------|----------------------------------|
| Publish EvaluationVersion | validate graph → update version status → archive previous PUBLISHED → emit domain event (after commit) |
| Create new DRAFT from PUBLISHED | clone node rows → clone edge rows → insert new EvaluationVersion row |
| Run Execution | insert execution row → insert execution_node_results rows (as nodes complete) → update execution status |
| Delete Schema (soft) | soft-delete schema → soft-delete all evaluations under it → soft-delete all versions |

Rules:
- Domain events must be emitted **after** the transaction commits, not inside it
- If any step inside a transaction fails, the entire operation rolls back
- Never perform external side effects (HTTP calls, emails) inside a transaction

---

## Backend Architecture

Follow Clean Architecture strictly.

```
src/
  domain/
    entities/
    value-objects/
    repositories/ (interfaces)
  application/
    use-cases/
    services/
  infrastructure/
    database/
      typeorm/
      repositories/ (implementations)
    plugins/
  modules/
    schema/
    evaluation/
    execution/
    plugin/
  shared/
    types/
    errors/
    events/
```

Rules:
- Zero business logic in controllers
- Use cases depend only on domain interfaces
- Infrastructure implements domain repository interfaces
- Plugins register via DI token — engine never imports plugin directly

---

## Caching Strategy

Design the architecture so caching can be added without changing business logic.

| Resource | Cache? | Reason |
|----------|--------|--------|
| `EvaluationVersion` (PUBLISHED) | Yes — immutable after publish, safe to cache indefinitely until archived | Cache key: `version:{id}` |
| `NodeDefinition` (plugins) | Yes — loaded at boot, never changes at runtime | In-memory cache in plugin registry |
| `Schema` + `Fields` | Yes — rarely changes | Cache with short TTL or invalidate on update |
| `Execution` results | Never | Runtime data, must always reflect true DB state |
| `execution_node_results` | Never | Analytics queries must hit live data |

Rules:
- Cache is an infrastructure concern — use cases must never know about caching
- Repository implementations may add caching transparently
- Cache invalidation: on `EvaluationVersion` archived → evict version cache

---

## Testing Strategy

Every layer must have tests. Tests are not optional.

### Unit Tests
- Every `NodeDefinition` plugin must include tests for:
  - `validate(config)` — valid config passes, invalid config returns errors
  - `execute(inputs, config)` — correct output for known inputs
  - `explain(inputs, config, result)` — returns human-readable string
  - type inference — output type matches declaration
- Domain entities: value object invariants, entity construction rules

### Application Tests
- Each use case tested in isolation with mocked repositories
- Covers: happy path, validation errors, not-found errors, permission violations

### Integration Tests
- Full flow against real PostgreSQL (use test database)
- Covers: Schema → Evaluation → Graph → Publish → Execute → Query results
- Use the TikTok Creator reference use case as the integration test fixture

### Execution Flow Tests
- DAG topological sort correctness
- Cycle detection
- Type mismatch detection
- Node failure recovery (PARTIAL execution)
- Transaction rollback on publish failure

### Plugin Contract Tests
- A shared test suite that any plugin must pass to be considered valid
- AI cannot skip plugin tests when implementing new node types

---

## Frontend — Screen Priority

### P0 (MVP — must exist)
| Screen | Description |
|--------|-------------|
| Schema Editor | Create schema, add/edit fields with types and validation |
| Graph Builder | Drag nodes from palette, connect edges, configure node params in side panel |
| Execution Runner | Input field values, trigger execution, see final result + status |

### P1
| Screen | Description |
|--------|-------------|
| Execution Trace Viewer | Expand each node: inputs received, output value, explanation, warnings, duration |
| Version Manager | List versions, see status (DRAFT/PUBLISHED/ARCHIVED), publish action |

### P2
| Screen | Description |
|--------|-------------|
| Plugin Discovery | Browse available node types, see manifest, config schema |
| Organization Dashboard | Execution history, success rate, average duration |

---

## API Design

### Schema
```
GET    /schemas
POST   /schemas
GET    /schemas/:id
PATCH  /schemas/:id
DELETE /schemas/:id

GET    /schemas/:id/fields
POST   /schemas/:id/fields
PATCH  /schemas/:id/fields/:fieldId
DELETE /schemas/:id/fields/:fieldId
```

### Evaluation
```
GET    /evaluations
POST   /evaluations
GET    /evaluations/:id
PATCH  /evaluations/:id

GET    /evaluations/:id/versions
POST   /evaluations/:id/versions          (create new draft from current)
GET    /evaluations/:id/versions/:vId
POST   /evaluations/:id/versions/:vId/publish
POST   /evaluations/:id/versions/:vId/validate
```

### Graph (design-time, on a DRAFT version)
```
GET    /versions/:vId/graph
PUT    /versions/:vId/graph/nodes
POST   /versions/:vId/graph/nodes
DELETE /versions/:vId/graph/nodes/:nodeId
POST   /versions/:vId/graph/edges
DELETE /versions/:vId/graph/edges/:edgeId
```

### Execution
```
POST   /executions                  { evaluation_version_id, input_values }
GET    /executions/:id
GET    /executions/:id/trace
GET    /evaluations/:id/executions  (list for an evaluation)
```

### Plugin
```
GET    /plugins                     (list all registered node types)
GET    /plugins/:type               (manifest + configSchema)
```

---

## Implementation Roadmap

Do NOT jump to code. Follow this order strictly. Each phase must be complete before the next begins.

### Phase 0 — Architecture (no code)
Produce all architecture artifacts in this order:
1. ADR (Architecture Decision Records) — key decisions with rationale
2. ERD — all tables, columns, cardinality
3. Domain Model — entities, value objects, aggregates
4. TypeORM Entities — with migration plan

**No implementation until Phase 0 artifacts are reviewed and approved.**

---

### Phase 1 — Database
- Run TypeORM migration
- Write seed data using TikTok Creator reference use case
- Verify ERD matches actual schema

---

### Phase 2 — Backend Skeleton
- NestJS module structure (no business logic yet)
- Empty services, controllers, repository interfaces
- Dependency injection wiring
- Health check endpoint only

---

### Phase 3 — Graph Engine (hardest part — do not rush)
Implement in this exact order:

```
Type System        → define DataType, Port, type compatibility rules
     ↓
NodeRegistry       → register(), discover(), get(), execute()
     ↓
DAG Builder        → build graph from node/edge rows, topological sort
     ↓
Executor           → walk DAG, call registry.execute() per node, collect NodeResult
     ↓
Validator          → cycle detection, orphan detection, type mismatch, missing ports
     ↓
Explainer          → call registry.explain() per node, build trace tree
```

Each step must have unit tests before moving to the next.

---

### Phase 4 — REST API + Business Logic
- Use cases: Schema CRUD, Evaluation CRUD, Graph edit, Publish, Execute
- Wire use cases into controllers
- All P0 endpoints

---

### Phase 5 — Frontend
- Schema Editor
- Graph Builder (React Flow)
- Execution Runner
- Execution Trace Viewer

---

### Phase 6 — Plugins
Write and test each plugin after the engine is stable:
- `input`, `normalize`, `threshold`, `output` (simple — do first)
- `weighted_average` (requires port ordering)
- `formula` (requires AST parser — do last)

---

### Out of scope for v1 (do not implement, do not design in detail)
- WebSocket real-time updates
- ML Node, Geo Node, Embedding Node
- Kafka / queue / event sourcing / CQRS
- Redis caching (design the interface, skip implementation)
- gRPC
- Formula DSL / Expression Compiler beyond basic AST

---

## Architecture Principles

The engine must maintain strict separation between four layers. No layer may bypass another.

```
Definition Layer
  ├── Schema
  ├── Field
  ├── Evaluation
  ├── EvaluationVersion
  ├── Node
  └── Edge

Execution Layer
  ├── Execution
  └── ExecutionNodeResult

Plugin Layer
  ├── NodeDefinition (contract)
  ├── Type System
  ├── Validation
  └── Execution logic

Presentation Layer
  ├── REST API (controllers)
  └── React UI
```

Rules:
- Definition Layer is immutable once published — Execution Layer only reads it
- Plugin Layer has no knowledge of persistence — it only receives inputs and returns outputs
- Presentation Layer has no business logic — it delegates entirely to use cases
- Domain Events flow outward (domain → infrastructure) — never inward

---

## Deliverables (in order — no code until architecture approved)

1. **Domain Model** — entities, value objects, relationships in plain language
2. **ER Diagram** — all tables, columns, relationships, cardinality
3. **TypeORM Entities** — full entity definitions with comments explaining each table's purpose
4. **Seed Data** — using TikTok Creator reference use case
5. **ADR (Architecture Decision Records)** — document key decisions: why normalized nodes over JSONB, why execution_node_results is a separate table, why domain events are post-commit, why plugin registry over hardcoded switch
6. **Folder Architecture** — backend + frontend, with explanation per folder
7. **API Design** — request/response shapes for all P0 endpoints with example payloads
8. **Execution Flow** — step-by-step: receive input → topological sort → execute nodes → insert node results → update execution status → emit domain event
9. **Graph Validation Flow** — what is checked, in what order, what structured errors are returned
10. **Versioning Strategy** — DRAFT/PUBLISH lifecycle, immutability via normalized rows, clone strategy, transaction boundary
11. **Plugin Architecture** — how NodeDefinition is registered, discovered, and called by the engine
12. **Explainability Architecture** — how trace is built per node, stored in execution_node_results, and returned via API
13. **Domain Event Architecture** — event types, emission timing (post-commit), handler interface, consumer examples

**Never generate code before all architecture artifacts are reviewed and explicitly approved.**
**Implementation proceeds module by module, in this order: Schema → Field → Evaluation → Versioning → Node/Edge → Execution → Plugin Registry.**

---

## Non-Goals (explicitly out of scope)

- Authentication / Authorization (assume JWT org context is injected)
- Rate limiting
- Billing
- Real-time collaboration on graph editing
- Exporting graphs to other formats (JSON export for backup is fine)
- Mobile UI
