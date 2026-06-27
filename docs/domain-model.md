# Domain Model

> Plain-language description of entities, value objects, and aggregates.
> No TypeScript, no framework imports. Code that matches this lives in `src/domain/` in Phase 2+.

---

## Entities vs Value Objects (cheat sheet)

| Question | Entity | Value Object |
|----------|--------|--------------|
| Has identity (id)? | YES | NO |
| Two equal fields = same thing? | NO | YES |
| Mutable over lifetime? | YES (carefully) | NO (immutable) |
| Examples below | Schema, Evaluation, EvaluationVersion, Node, Edge, Execution, ExecutionNodeResult, Organization | DataType, Port, GraphCoordinates, ValidationError, FieldKey |

---

## Entities

### Organization
The tenant boundary. Every other entity either belongs directly to an Organization or is reachable from one through an aggregate root.

| Property | Type | Notes |
|----------|------|-------|
| id | string (UUID) | PK |
| name | string | display name |
| createdAt | Date | UTC |
| updatedAt | Date | UTC |

**No soft delete.** An Organization is the tenant; deleting one is out of scope for MVP.

**Not part of any aggregate.** It is context. Other aggregates reference it via `organizationId`.

---

### Schema
Defines the structure of input data for one domain (e.g. "TikTok Creator"). Belongs to one Organization. Soft-deletable.

| Property | Type | Notes |
|----------|------|-------|
| id | string (UUID) | PK |
| organizationId | OrganizationId | tenant |
| name | string | |
| description | string \| null | |
| createdAt | Date | UTC |
| updatedAt | Date | UTC |
| deletedAt | Date \| null | soft-delete marker |

**Aggregate root.** Owns Fields. Schema is deletable only when no Evaluation references it.

---

### Field
One input variable on a Schema. Composite of (key, data_type). Cannot exist without its Schema.

| Property | Type | Notes |
|----------|------|-------|
| id | string (UUID) | PK |
| schemaId | SchemaId | parent |
| key | string (FieldKey) | machine-readable; unique per schema |
| displayName | string | UI label |
| description | string \| null | |
| dataType | DataType | one of: number, string, boolean, datetime, percentage, array, object |
| validation | ValidationRules \| null | JSON: min/max/regex/required |
| metadata | FieldMetadata \| null | JSON: unit, tags |

**Part of Schema aggregate.** A Field is created, edited, and deleted together with its Schema's lifecycle.

---

### Evaluation
One named rule graph ("Creator Quality Score"). Belongs to one Organization. References one Schema. Soft-deletable.

| Property | Type | Notes |
|----------|------|-------|
| id | string (UUID) | PK |
| organizationId | OrganizationId | tenant |
| schemaId | SchemaId | input data shape |
| name | string | |
| description | string \| null | |
| createdAt | Date | UTC |
| updatedAt | Date | UTC |
| deletedAt | Date \| null | soft-delete |

**Aggregate root.** Owns EvaluationVersions. Has NO graph data of its own — that's the whole point of versioning.

---

### EvaluationVersion
One version of an Evaluation's graph. Has a status and may be mutable or immutable.

| Property | Type | Notes |
|----------|------|-------|
| id | string (UUID) | PK |
| evaluationId | EvaluationId | parent |
| versionNumber | number | 1, 2, 3, ...; unique per evaluation |
| status | EvaluationVersionStatus | DRAFT \| PUBLISHED \| ARCHIVED |
| publishedAt | Date \| null | set when status → PUBLISHED |
| createdAt | Date | UTC |
| updatedAt | Date | UTC |
| deletedAt | Date \| null | soft-delete |

**Aggregate root.** Owns its Nodes and Edges. The graph is owned by the version, NOT by the Evaluation.

**State machine:**
```
       DRAFT ──publish──► PUBLISHED ──archive──► ARCHIVED
         │                   │                      │
         │                   ▼                      │
         │              (only one                   │
         │               PUBLISHED                  │
         │               per Evaluation)            │
         │                                          │
         └───────clone from any status (read-only) ─┘
```

---

### Node
One element in a graph. References a NodeDefinition by `nodeType` (string). Has typed input/output ports defined by the plugin.

| Property | Type | Notes |
|----------|------|-------|
| id | string (UUID) | PK |
| evaluationVersionId | EvaluationVersionId | parent |
| nodeType | string | matches a NodeDefinition.type at runtime |
| label | string | UI label |
| config | JSON | validated by NodeDefinition.configSchema |
| positionX | number | UI layout |
| positionY | number | UI layout |
| createdAt | Date | UTC |
| updatedAt | Date | UTC |

**Part of EvaluationVersion aggregate.** Cannot exist without a parent version. Mutability gated by `VersionMutabilityGuard` — only DRAFT versions accept node mutations.

---

### Edge
Connection from one Node's output port to another Node's input port. Port names matter: `A→B` and `B→A` are different edges.

| Property | Type | Notes |
|----------|------|-------|
| id | string (UUID) | PK |
| evaluationVersionId | EvaluationVersionId | parent |
| fromNodeId | NodeId | source |
| fromPort | string | output port name |
| toNodeId | NodeId | target |
| toPort | string | input port name |
| executionOrder | number | pre-computed by topological sort, cached for UI hints |

**Part of EvaluationVersion aggregate.** Mutability gated same as Node.

---

### Execution
One runtime evaluation of a graph against input data. Append-only.

| Property | Type | Notes |
|----------|------|-------|
| id | string (UUID) | PK |
| organizationId | OrganizationId | denormalized from EvaluationVersion for query efficiency |
| evaluationVersionId | EvaluationVersionId | the frozen version that ran |
| status | ExecutionStatus | PENDING \| RUNNING \| SUCCESS \| PARTIAL \| FAILED |
| inputValues | JSON | field key → value |
| finalResult | JSON \| null | output node values, set on completion |
| startedAt | Date | UTC |
| finishedAt | Date \| null | UTC, set on terminal status |

**Aggregate root.** Owns ExecutionNodeResults.

**Never modifies EvaluationVersion.** A successful execution leaves zero footprint on the version it ran against.

---

### ExecutionNodeResult
One node's output during one execution. Separate table per ADR-0002.

| Property | Type | Notes |
|----------|------|-------|
| id | string (UUID) | PK |
| executionId | ExecutionId | parent |
| nodeId | NodeId | the node that produced this result |
| status | NodeExecutionStatus | SUCCESS \| ERROR \| SKIPPED |
| value | JSON \| null | the node's output |
| inputsReceived | JSON \| null | what the node received from upstream |
| explanation | string \| null | from NodeDefinition.explain() |
| warnings | string[] | non-fatal issues |
| error | string \| null | error message if status=ERROR |
| durationMs | number \| null | timing |
| createdAt | Date | UTC |

**Part of Execution aggregate.**

---

## Value Objects

### DataType
```typescript
type DataType = 'number' | 'string' | 'boolean' | 'datetime' | 'percentage' | 'array' | 'object';
```
Type compatibility rules live in `src/shared/type-system/type-compatibility.ts` (Phase 3).

### Port
```typescript
interface Port {
  name: string;
  type: DataType;
  required: boolean;
  description: string;
}
```
Pure shape. Created by plugins, never persisted directly — they're embedded in NodeDefinition.

### GraphCoordinates
```typescript
interface GraphCoordinates { x: number; y: number; }
```
Created via `createCoordinates(x, y)` which validates `Number.isFinite`.

### ValidationError
```typescript
interface ValidationError {
  code: ErrorCode;
  message: string;
  nodeId?: NodeId;
  edgeId?: EdgeId;
}
```
Produced by `GraphValidatorService` (Phase 3).

### ValidationRules / FieldMetadata
JSON shapes — opaque to the domain layer; validated structurally by `class-validator` at DTO boundaries.

### EvaluationVersionStatus / ExecutionStatus / NodeExecutionStatus
String literal unions (Phase 3 constants file).

---

## Aggregate Boundaries (transactional consistency)

| Aggregate | Root | Contained | Invariant |
|-----------|------|-----------|-----------|
| **Schema** | Schema | Field[] | Fields exist only with their schema. Cascade delete. |
| **Evaluation** | Evaluation | EvaluationVersion[] | Versions belong to one Evaluation. Cascade soft-delete. |
| **EvaluationVersion** | EvaluationVersion | Node[], Edge[] | Graph is consistent within one version. Clone = new aggregate. |
| **Execution** | Execution | ExecutionNodeResult[] | All node results committed with execution status. |
| **Organization** | (context only) | — | No contained entities. |

### Cross-aggregate references use IDs only
- A `Node` references `Field` (Schema aggregate) by `fieldId` stored in `config` — never by `Field` object.
- An `Execution` references `EvaluationVersion` by `evaluationVersionId` — different aggregate.
- A `Field` references its `Schema` by `schemaId` — same aggregate (one-level nesting).

---

## Why this shape

1. **Schema and Field are an aggregate** because Field cannot exist without Schema, and they are edited together.
2. **Evaluation and EvaluationVersion are separate aggregates** (not one nested aggregate) because versions are independently soft-deletable, the immutable-after-publish rule must apply to the version not the evaluation, and cloning a version = a brand new aggregate root.
3. **Nodes and Edges live under EvaluationVersion**, not Evaluation — this is the entire point of versioning. Without this, you cannot have multiple versions of the same evaluation without row duplication on Evaluation.
4. **Execution and ExecutionNodeResults are separate from Definition aggregates** because executions are runtime data, append-only, never affect definitions. They are not edited together with versions.
5. **Organization is context, not an aggregate** — it has no contained entities. It's the "current tenant" injected by middleware.

---

## Cardinality summary

| Parent | Child | Cardinality |
|--------|-------|-------------|
| Organization | Schema | 1 : many |
| Organization | Evaluation | 1 : many |
| Organization | Execution | 1 : many |
| Schema | Field | 1 : many (unique key per schema) |
| Schema | Evaluation | 1 : many |
| Evaluation | EvaluationVersion | 1 : many (unique version_number per evaluation) |
| EvaluationVersion | Node | 1 : many |
| EvaluationVersion | Edge | 1 : many |
| EvaluationVersion | Execution | 1 : many |
| Execution | ExecutionNodeResult | 1 : many (one row per node in the version) |
| Node | Edge (as `from_node`) | 1 : many |
| Node | Edge (as `to_node`) | 1 : many |

---

## What's NOT a domain concept

These are infrastructure concerns — they exist in `src/infrastructure/`, not `src/domain/`:

- HTTP request/response shapes (DTOs)
- Database entities (TypeORM)
- Cache entries
- Job queue items
- Audit log rows
- The plugin classes themselves (they're an integration pattern, not a domain concept; the domain knows about `NodeDefinition` as a contract only)

The `NodeDefinition` interface itself is part of the **Plugin Layer** (per the architecture doc § Architecture Principles), living in `src/shared/plugins/` — shared because both engine code and plugin implementations depend on it, but neither domain nor infrastructure owns it.
