# ADR-0004: Plugin registry over hardcoded `switch(nodeType)`

## Status
Accepted

## Context
The architecture doc (`docs/rule_engine_prompt.md` § Plugin System) is explicit:

> "Engine core must have zero knowledge of specific node implementations."
> "No `if (type === 'threshold')`. No `switch(type)`. Ever."

A naive executor might look like:

```typescript
async executeNode(node: NodeRow, inputs: Record<string, unknown>) {
  switch (node.nodeType) {
    case 'input':           return new InputPlugin().execute(...);
    case 'normalize':       return new NormalizePlugin().execute(...);
    case 'threshold':       return new ThresholdPlugin().execute(...);
    case 'weighted_average': return new WeightedAveragePlugin().execute(...);
    // ... exhaustively list every plugin
  }
}
```

This works but has a fatal flaw: **adding a new plugin requires editing engine code**. A team that wants to ship a `regex` or `http` plugin (Phase 2 per the doc) must merge to `src/modules/execution/engine/executor.ts`. This violates Open/Closed Principle.

## Decision
**All engine code interacts with plugins exclusively through a `NodeRegistry` interface.** Concrete plugin classes are never imported by engine code.

```typescript
// In executor — engine code
const definition = this.registry.get(node.nodeType);
return definition.execute(inputs, node.config);
```

Plugins self-register at boot via NestJS DI. The registry aggregates them in a `Map<string, NodeDefinition>`:

```typescript
@Module({
  providers: [InputPlugin, NormalizePlugin, ThresholdPlugin, WeightedAveragePlugin, PluginRegistryService, ...],
})
export class PluginModule {}
```

Adding a new plugin = (1) write the class, (2) add it to `providers`, (3) write tests. Zero changes to engine code.

## Consequences
### Positive
- **Open/Closed Principle.** Engine is closed for modification, open for extension. New plugins drop in.
- **Engine is unit-testable in isolation.** A fake `NodeRegistry` returns canned `NodeDefinition`s; engine tests don't need real plugins.
- **Plugin manifest endpoint is free.** The registry already has all metadata (ports, configSchema, version); a `GET /plugins` endpoint just maps over `registry.discover()`.
- **Plugin removal is also safe.** Removing a plugin from `providers` removes it from the registry; engine code never had a hard reference.

### Negative
- **Indirection cost.** Engine code calls `registry.get()` instead of `new ThresholdPlugin()`. One extra hop per node execution. Negligible.
- **Errors are deferred.** `registry.get(type)` throws `UnknownNodeTypeError` at runtime if a plugin is missing. Mitigated by graph validation: a graph with unknown node types cannot be published.

### Neutral
- **Plugins live in `src/infrastructure/plugins/core/`** — not `src/modules/execution/`. They are infrastructure concerns, even though they look like domain logic.

## Alternatives Considered
1. **Hardcoded switch in executor** — Rejected. Every new plugin = engine PR = merge conflict risk.
2. **Plugin classes registered by string name in a global config** — Rejected. Loses NestJS DI, loses constructor injection (logger, config service).
3. **Dynamic `import()` per node type** — Rejected. Adds startup latency, more complex than DI.

## References
- `docs/rule_engine_prompt.md` § Plugin System — "NodeRegistry — the only entry point"
- `docs/rule_engine_prompt.md` § Architecture Principles — "Plugin Layer has no knowledge of persistence"
