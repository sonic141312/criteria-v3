# ADR-0003: Domain events are emitted after transaction commit, never inside

## Status
Accepted

## Context
The architecture doc (`docs/rule_engine_prompt.md` § Transaction Boundaries, § Domain Events) is explicit:

> "Domain events are emitted after a transaction commits — never inside the transaction"
> "If any step inside a transaction fails, the entire operation rolls back"

The temptation is to publish events inline with the DB write: it's one less `await`, one less code path, and consumers get notified immediately. But it creates the **ghost-event** problem: if the transaction rolls back AFTER the event was sent, downstream consumers (audit logs, notifications, webhooks) believe something happened that didn't.

## Decision
**Use a two-phase pattern in every use case that emits a domain event:**

```typescript
// Phase 1: ALL writes inside the transaction.
const result = await this.tx.run(async (em) => {
  // ... mutations ...
});

// Phase 2: events emitted AFTER tx commits.
await this.events.publish({ eventType: '...', ... });
```

No `events.publish()` call may appear inside a `dataSource.transaction(async em => { ... })` callback.

## Consequences
### Positive
- **No ghost events.** If the transaction rolls back, no event was sent. Consumers never see events for things that didn't happen.
- **Idempotent retry is safe.** A use case that fails after the transaction commits but before publishing the event can be retried: the second run will commit and publish, and consumers must be idempotent anyway.
- **Easy to reason about.** The rule is mechanical: "look for `await events.publish` — is it inside a `tx.run` callback?"

### Negative
- **One extra `await`** in every use case that emits events. Negligible.
- **Crash window:** if the process dies between `tx.run` resolving and `events.publish` resolving, the event is lost. Acceptable for v1; an outbox pattern is the v2 solution.

### Neutral
- **Consumers must be idempotent.** This is already a general requirement of event-driven systems; not new with this rule.

## Alternatives Considered
1. **Publish inline** — Rejected. Ghost events. The most common source of subtle bugs in event-driven systems.
2. **Transactional outbox pattern** — Rejected for v1. Adds a `domain_events` table, a separate publisher process, and a polling/CDC mechanism. Out of scope per the architecture doc (§ Out of scope: "Kafka / queue / event sourcing / CQRS"). Design should not block adding it later.
3. **Two-phase commit with the message broker** — Rejected. Out of scope (no message broker in v1).

## References
- `docs/rule_engine_prompt.md` § Transaction Boundaries — "Domain events must be emitted after the transaction commits, not inside it"
- `docs/rule_engine_prompt.md` § Domain Events — table of event types with their payloads

## Future Work
If event loss becomes a problem, introduce a `domain_events` outbox table inside the same transaction, with a separate publisher that reads from it. The current use case shape (two-phase: tx → publish) does not need to change.
