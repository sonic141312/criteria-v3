# ADR-0007: MVP authentication via `X-Org-Id` header (dev-mode stub)

## Status
Accepted (MVP only — must be replaced before any non-local environment)

## Context
The architecture doc (`docs/rule_engine_prompt.md` § Permission Model) says:

> "Authentication is out of scope for MVP"
> "When implementing use cases, assume a `RequestContext` object is injected that carries `organization_id`. Do not hard-wire user resolution into business logic."

But the system must enforce multi-tenancy from day one. We need an `organizationId` to inject into `RequestContext` on every request, without building a full auth system.

We must decide how to source `organizationId` in MVP.

## Decision
**In MVP, an `OrgContextInterceptor` reads `X-Org-Id` from request headers and populates `request.user = { organizationId, userId: 'dev-user' }`.** Real authentication is out of scope and replaced before any deployment beyond `localhost`.

The interceptor is wired globally in `main.ts`. It runs before route handlers and after CORS / body parsing.

```typescript
// src/infrastructure/auth/org-context.interceptor.ts
@Injectable()
export class OrgContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const orgId = req.headers['x-org-id'];
    if (!orgId || !isUuid(orgId)) {
      throw new BadRequestException('Missing or invalid X-Org-Id header.');
    }
    req.user = { organizationId: orgId, userId: 'dev-user' };
    return next.handle();
  }
}
```

A guard rejects requests missing the header. Integration tests send `X-Org-Id: <uuid>` on every call.

## Consequences
### Positive
- **Zero friction in dev.** Frontend devs, API consumers, and tests all set one header.
- **Multi-tenancy is real from day one.** Every endpoint enforces org isolation. The code paths that need to work are the same code paths that will run in production.
- **Easy to swap.** Replace the interceptor with a `JwtAuthGuard` that decodes a JWT and extracts `orgId` from claims. Controllers, use cases, and repositories are unchanged.

### Negative
- **Anyone can spoof an org.** `X-Org-Id` is unauthenticated. **Do not deploy to any non-localhost environment.**
- **No RBAC.** Even within an org, any caller can do anything. Acceptable for MVP per the doc.

### Neutral
- **`X-Org-Id` is a header, not a query param.** Headers don't leak to access logs as easily.

## Migration Plan to Real Auth

1. Introduce `AuthModule` with `JwtStrategy` (passport-jwt).
2. Replace `OrgContextInterceptor` with `JwtAuthGuard`. The guard populates `request.user = { userId, organizationId, roles }` from the JWT.
3. Update integration tests to sign and send JWTs.
4. Remove the `X-Org-Id` interceptor entirely.

The `RequestContext` interface stays the same. Controllers, use cases, and repositories are untouched.

## Forbidden Patterns

- ❌ Reading `X-Org-Id` directly inside a controller. Always go through `request.user.organizationId`.
- ❌ Accepting `organizationId` in the request body. Repositories cannot tell the difference between "user said they belong to org X" and "system knows they belong to org X".
- ❌ Adding `X-Org-Id` support to production. It is dev-only and must be removed.

## References
- `docs/rule_engine_prompt.md` § Permission Model — "assume a `RequestContext` object is injected"
- ADR-0005 — Multi-tenancy enforced at query level (this ADR is the source of `RequestContext.organizationId`)
