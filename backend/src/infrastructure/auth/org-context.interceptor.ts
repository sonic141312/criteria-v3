import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Injects `request.user = { organizationId }` from X-Org-Id header.
 *
 * MVP only — replace with JwtAuthGuard before any non-local deployment.
 * See ADR-0007.
 */
@Injectable()
export class OrgContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request>();
    const orgId = req.headers['x-org-id'];

    if (!orgId || typeof orgId !== 'string' || !isUuid(orgId)) {
      throw new BadRequestException(
        'Missing or invalid X-Org-Id header. Must be a valid UUID.',
      );
    }

    req.user = { organizationId: orgId };
    return next.handle();
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

declare global {
  // Augment Express Request to include our user property
  namespace Express {
    interface Request {
      user?: { organizationId: string };
    }
  }
}
