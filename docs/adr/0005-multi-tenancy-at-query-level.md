# ADR-0005: Multi-tenancy enforced at the query level (repository), not the application layer

## Status
Accepted

## Context
The architecture doc (`docs/rule_engine_prompt.md` § Multi-tenancy, § Permission Model) is explicit:

> "`organization_id` must exist on every major table: `Schema`, `Field`, `Evaluation`, `EvaluationVersion`, `Execution`"
> "Data must be isolated at the database query level — never rely on application-level filtering alone"
> "`organization_id` is always enforced at the query level — never trust application-level filtering alone"

The naive pattern:

```typescript
// Application-layer filtering — INSECURE
async list() {
  return this.repo.find({});  // ← forgot the where clause, all tenants leak
}
```

The right pattern:

```typescript
// Query-level enforcement
async list(orgId: OrganizationId) {
  return this.repo.find({ where: { organizationId: orgId, deletedAt: IsNull() } });
}
```

We must decide WHERE the org filter lives. Two candidates: the controller / use case, or the repository.

## Decision
**The repository method signature is `findX(orgId: OrganizationId, ...)`.** The `organizationId` argument is required and is the FIRST argument (so it's hard to forget). The repository includes it in every `where` clause. There is no `findX()` overload without `orgId`.

```typescript
// src/infrastructure/database/repositories/typeorm-schema.repository.ts
async findById(orgId: OrganizationId, id: string): Promise<Schema | null> {
  return this.repo.findOne({ where: { id, organizationId: orgId, deletedAt: IsNull() } });
}
```

Use cases obtain `orgId` from `RequestContext` (injected by `@ReqContext()` decorator) and pass it down. There is no shortcut, no "current org" service, no global state.

## Consequences
### Positive
- **Cannot accidentally bypass the filter.** The signature requires it. Code review catches missing args (TypeScript compile error).
- **Defense in depth.** Even if a controller forgets to set `request.user.organizationId`, the repo will receive `undefined` and Prisma/TypeORM will produce an empty result — never the wrong tenant's data.
- **Cross-tenant access becomes "not found", not "forbidden".** Returning null (not 403) for rows in other tenants prevents existence leaks.
- **Easy to audit.** Every repository method has `orgId` in its signature; reviewers grep for `where:` and verify `organizationId` is present.

### Negative
- **Boilerplate.** Every repo method takes and forwards `orgId`. Acceptable; the type system enforces it.
- **Test fixtures must create an Organization first.** Integration tests set up `org-A`, `org-B`, and verify isolation. Worth the cost.

### Neutral
- **Dev-mode `X-Org-Id` header is allowed in MVP.** A custom interceptor reads the header and populates `request.user.organizationId`. This is documented in ADR-0007.

## Alternatives Considered
1. **Application-layer filtering (controllers set a "current org" service)** — Rejected. One missed `setOrgId()` leaks data across tenants. Easy to bypass, hard to audit.
2. **Row-Level Security (RLS) in PostgreSQL** — Considered, deferred to v2. Would require a DB user per org or a session variable. Powerful but adds operational complexity. Repository-level filtering is sufficient for v1.
3. **Schema-per-tenant** — Rejected per the architecture doc: "Do NOT design a shared-schema multi-tenant model".

Wait — the doc actually says **do** use shared-schema. Rereading: "Data must be isolated at the database query level" + "Do NOT design a shared-schema multi-tenant model" — these are about NOT isolating tenants into separate databases. They confirm shared-schema + query-level isolation. Documented here so future readers don't misread.

## References
- `docs/rule_engine_prompt.md` § Multi-tenancy
- `docs/rule_engine_prompt.md` § Permission Model

## Future Work
- PostgreSQL Row-Level Security can be added in v2 as a second layer of defense. The repository pattern does not change.
- Real JWT auth + RBAC replaces the `X-Org-Id` dev header. The repository pattern does not change.
