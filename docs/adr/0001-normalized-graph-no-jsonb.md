# ADR-0001: Graph data is normalized rows, never JSONB snapshot

## Status
Accepted

## Context
The architecture doc (`docs/rule_engine_prompt.md` § Database Design, § EvaluationVersion) requires:
> "Nodes and edges are fully normalized rows — never stored as JSONB blobs"
> "Do NOT snapshot graph to JSONB on publish — the normalized rows ARE the source of truth at all times"

A `graph_snapshot Json?` column on `evaluation_versions` would be a convenient shortcut: copy the whole graph as one blob on publish, serve it from a single column. This is tempting because rendering a graph in one shot becomes a single row read.

We must decide whether to follow the convenience or the rule.

## Decision
**Reject the JSONB snapshot.** Node and edge data are stored only as normalized rows. Each `EvaluationVersion` owns its own `nodes` and `edges` rows.

A "render the whole graph in one shot" endpoint queries `nodes` + `edges` for the version and returns the joined payload — the database does the join.

## Consequences
### Positive
- **Versioning is first-class.** Editing a DRAFT edits rows in place. Publishing freezes those rows. Cloning a DRAFT from a PUBLISHED version is `INSERT ... SELECT` with new UUIDs — no JSON surgery.
- **Analytics on individual nodes/edges is trivial.** "Show me all nodes that ever errored", "average duration per node type", "find all edges where from_port doesn't match the upstream node's output port" — all direct SQL.
- **Immutability of PUBLISHED versions is enforceable.** A repository `UPDATE nodes WHERE version.status='PUBLISHED'` returns zero rows. No need to compare blobs to detect drift.
- **Migration safety.** Adding a new column to `nodes` (e.g. `color`, `icon`) is a single ALTER TABLE; existing rows get a default. With a JSONB snapshot, old blobs become unreadable.

### Negative
- **One-shot graph reads require a JOIN.** The `/versions/:vId/graph` endpoint runs `SELECT * FROM nodes WHERE evaluation_version_id = $1` then `SELECT * FROM edges WHERE evaluation_version_id = $1`. Two queries or one join — not one.
- **Slightly more rows.** A graph with 50 nodes + 80 edges = 130 rows vs 1 row. In practice this is negligible.

### Neutral
- **Render payload size is the same** — the JSON returned to the client is identical regardless of storage shape.

## Alternatives Considered
1. **JSONB snapshot column** — Rejected. Breaks versioning, analytics, immutability enforcement. Saves one query, costs the entire architecture.
2. **Hybrid: JSONB + normalized rows** — Rejected. Two sources of truth = guaranteed drift. Every read needs reconciliation logic.

## References
- `docs/rule_engine_prompt.md` § Database Design — "No EAV tables", "Nodes and edges are fully normalized rows — never stored as JSONB blobs"
- `docs/rule_engine_prompt.md` § EvaluationVersion — "Do NOT snapshot graph to JSONB on publish"
