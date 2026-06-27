/**
 * Branded types to prevent mixing up UUIDs of different domain concepts.
 * A raw string can be cast to any Brand<T>, but the type system enforces
 * that the intent is correct.
 *
 * Usage:
 *   const orgId = '00000000-0000-0000-0000-000000000001' as OrganizationId;
 *   const result = repo.findById(orgId, schemaId); // ✅ type checks
 *
 * In the database, these are stored as uuid columns — no DB-level difference.
 * The branded types are a TypeScript-only constraint.
 */

export interface Brand<Name extends string> {
  readonly __brand: Name;
}

export type OrganizationId = Brand<'OrganizationId'> & string;
export type SchemaId = Brand<'SchemaId'> & string;
export type FieldId = Brand<'FieldId'> & string;
export type EvaluationId = Brand<'EvaluationId'> & string;
export type EvaluationVersionId = Brand<'EvaluationVersionId'> & string;
export type NodeId = Brand<'NodeId'> & string;
export type EdgeId = Brand<'EdgeId'> & string;
export type ExecutionId = Brand<'ExecutionId'> & string;
export type ExecutionNodeResultId = Brand<'ExecutionNodeResultId'> & string;
