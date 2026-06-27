# criteria-system-v3 — Backend

Production-ready generic Rule Engine / Evaluation Engine.
Built per `docs/rule_engine_prompt.md`.

## Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0 | ✅ Approved | ADRs, Domain Model, ERD, TypeORM Entities spec |
| Phase 1 | ✅ Done | Entities, datasource, migrations, seed |
| Phase 2 | ✅ Done | NestJS skeleton (health check only) |
| Phase 3 | ✅ Done | Graph Engine (TypeSystem → Registry → DAG → Executor → Validator → Explainer) |
| Phase 4 | ✅ Done | REST API + business logic use cases (all P0 endpoints) |
| Phase 5 | ✅ Done | Frontend (Schema Editor + Graph Builder + Execution Runner) |
| Phase 6 | ✅ Done | 6 core plugins (input, normalize, threshold, output, weighted_average, formula) |

---

## Tech stack

- Node.js ≥ 20, pnpm ≥ 8
- NestJS 10 + TypeScript 5 (strict mode)
- TypeORM 0.3 + PostgreSQL 14+
- class-validator + class-transformer for DTO validation
- React 18 + Vite + React Flow + TanStack Query + TailwindCSS + shadcn/ui

---

## Project layout

```
backend/
├── src/
│   ├── main.ts                              # bootstrap + ValidationPipe
│   ├── app.module.ts                        # root module + PluginBootstrapService
│   ├── shared/
│   │   ├── errors/                         # error codes, ValidationResult helpers
│   │   ├── plugins/                        # NodeDefinition interface, NodeRegistry
│   │   ├── type-system/                    # DataType, Port, type compatibility
│   │   └── types/                          # branded IDs (OrganizationId, etc.)
│   ├── engine/                             # Pure graph engine (no framework imports)
│   │   ├── graph/                          # DagBuilder, EvaluationGraph
│   │   ├── executor/                       # Executor (topological walk)
│   │   ├── validator/                      # GraphValidator (cycle, orphan, type check)
│   │   └── explainer/                      # Explainer (trace tree)
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── typeorm/                    # datasource, entities (9), migrations (2)
│   │   │   └── repositories/              # TypeORM implementations
│   │   ├── auth/                           # OrgContextInterceptor (MVP X-Org-Id)
│   │   └── plugins/core/                   # 6 core plugins + PluginBootstrapService
│   └── modules/                            # REST API modules
│       ├── health/                        # GET /health
│       ├── schema/                         # Schemas + Fields CRUD
│       ├── evaluation/                     # Evaluations + Versions CRUD + publish
│       ├── graph/                         # Nodes + Edges on DRAFT versions + validate
│       ├── execution/                     # Run + Trace
│       └── plugin/                        # GET /plugins, GET /plugins/:type
├── test/
│   ├── unit/
│   │   ├── type-system/                   # DataType, type compatibility tests
│   │   └── engine/                        # NodeRegistry, DagBuilder, Executor, GraphValidator
│   └── fixtures/                          # Shared test fixtures
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

Path aliases:
- `@/*` → `src/*`
- `@domain/*` → `src/domain/*`
- `@infrastructure/*` → `src/infrastructure/*`
- `@modules/*` → `src/modules/*`
- `@shared/*` → `src/shared/*`
- `@engine/*` → `src/engine/*`

---

## Quick start

```bash
# Backend
cd backend
pnpm install
cp .env.example .env
createdb criteria_system_v3     # one-time
pnpm run migration:run
pnpm run start:dev
# → http://localhost:3000/health

# Frontend (new terminal)
cd frontend
pnpm install
pnpm run dev
# → http://localhost:5173
```

---

## API endpoints

### Schemas
```
GET    /schemas
POST   /schemas
GET    /schemas/:id
PATCH  /schemas/:id
DELETE /schemas/:id

GET    /schemas/:id/fields
POST   /schemas/:id/fields
DELETE /schemas/:id/fields/:fieldId
```

### Evaluations
```
GET    /evaluations
POST   /evaluations
GET    /evaluations/:id

GET    /evaluations/:id/versions
POST   /evaluations/:id/versions          # create new DRAFT from latest
POST   /evaluations/:id/versions/:vId/publish
```

### Graph (DRAFT version)
```
GET    /versions/:vId/graph
POST   /versions/:vId/graph/nodes
PUT    /versions/:vId/graph/nodes/:nodeId
DELETE /versions/:vId/graph/nodes/:nodeId
POST   /versions/:vId/graph/edges
DELETE /versions/:vId/graph/edges/:edgeId
POST   /versions/:vId/graph/validate
```

### Executions
```
POST   /executions                        { evaluationVersionId, inputValues }
GET    /executions/:id
GET    /executions/:id/trace
```

### Plugins
```
GET    /plugins
GET    /plugins/:type
```

---

## MVP auth

Every request needs `X-Org-Id: <uuid>` header.
See ADR-0007 for details and migration plan to real JWT auth.

---

## Reference use case (seeded)

- Organization: `00000000-0000-0000-0000-000000000001` ("Acme Creators")
- Schema: `00000000-0000-0000-0000-000000000010` ("TikTok Creator")
- Evaluation: `00000000-0000-0000-0000-000000000020` ("Creator Quality Score")
- Version: `00000000-0000-0000-0000-000000000021` (PUBLISHED, v1)
- 7 nodes + 7 edges (per docs/rule_engine_prompt.md § Reference Use Case)

Test:

```bash
curl -H "X-Org-Id: 00000000-0000-0000-0000-000000000001" \
     http://localhost:3000/health

curl -H "X-Org-Id: 00000000-0000-0000-0000-000000000001" \
     http://localhost:3000/schemas

curl -X POST -H "X-Org-Id: 00000000-0000-0000-0000-000000000001" \
     -H "Content-Type: application/json" \
     -d '{"evaluationVersionId":"00000000-0000-0000-0000-000000000021","inputValues":{"followers":1200000,"engagement_rate":4.2,"growth_rate":15}}' \
     http://localhost:3000/executions
```

---

## Architecture invariants

| Rule | ADR |
|------|-----|
| Multi-tenancy at query level | ADR-0005 |
| No business logic in controllers | — |
| Domain events post-tx | ADR-0003 |
| Plugins via registry | ADR-0004 |
| Graph = normalized rows | ADR-0001 |
| execution_node_results = separate table | ADR-0002 |
| Formula = AST | ADR-0006 |
| PUBLISHED versions immutable | docs § EvaluationVersion |

---

## License

Internal / proprietary.
