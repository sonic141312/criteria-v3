# ADR-0002: `execution_node_results` is a separate table, not a JSONB blob

## Status
Accepted

## Context
The architecture doc (`docs/rule_engine_prompt.md` § Execution, § Database Design) is explicit:

> "Each node execution is stored as a separate row — not collapsed into a JSONB blob."
> "`execution_node_results` is a normalized table — one row per node per execution (NOT JSONB in executions)"

Why: enabling analytics on per-node runtime behavior (slowest nodes, failure rate by node type, etc.) requires queryable, filterable, aggregatable rows.

We must decide whether to follow the rule or fold node results into a JSONB column on `executions`.

## Decision
**Keep `execution_node_results` as a separate table.** Every node execution writes one row.

For an execution with N nodes, we write N rows in a single batch (`repo.insert([...])`).

## Consequences
### Positive
- **Per-node analytics are trivial SQL:**
  - "Top 10 slowest nodes" → `SELECT node_id, AVG(duration_ms) ... GROUP BY node_id ORDER BY 2 DESC LIMIT 10`
  - "Failure rate by node_type" → JOIN with `nodes`, GROUP BY `node_type`
  - "All executions where Output node errored" → `WHERE status='ERROR' AND node_id IN (SELECT id FROM nodes WHERE node_type='output')`
- **Streaming results during long executions.** We can insert per-node results as each node finishes, before the execution completes. The trace endpoint can show partial progress.
- **Indexes matter.** `(execution_id)`, `(node_id, status)`, `(node_id)` for the queries above.

### Negative
- **One execution = 1 + N writes.** For a 50-node graph, one execution writes 51 rows. Acceptable; they all go in one transaction.
- **Slightly larger storage** than a single JSONB blob. Trivially compressible.

### Neutral
- **Read pattern unchanged** — the `/executions/:id/trace` endpoint still returns one JSON document; it just aggregates the rows server-side.

## Alternatives Considered
1. **JSONB blob `node_results Json` on `executions`** — Rejected. Breaks analytics. Cannot answer "which nodes fail most often" without parsing JSONB paths in every query.
2. **Separate table but with `result Json` containing all node outputs** — Rejected (degenerate). Same as the JSONB blob with extra steps.
3. **Event-sourced append-only log + materialized view** — Rejected. Over-engineering for v1. Could be added later without breaking the schema.

## References
- `docs/rule_engine_prompt.md` § Execution — "Each node execution is stored as a separate row — not collapsed into a JSONB blob"
- `docs/rule_engine_prompt.md` § Database Design — "enables analytics: slowest nodes, most-failing nodes, failure rate per node type"
