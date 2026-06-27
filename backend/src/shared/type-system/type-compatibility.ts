import { DataType, COMPARABLE_TYPES, BOOLEAN_COMPATIBLE_TYPES, NUMERIC_TYPES } from './data-types';

/**
 * Result of a type compatibility check.
 */
export interface TypeCheckResult {
  compatible: boolean;
  reason?: string;
}

/**
 * Type compatibility rules.
 *
 * Engine validates that the output type of a source port matches the
 * input type of a target port at graph-validation time (not execution time).
 *
 * Compatibility is directional: an edge from port A to port B checks whether
 * the type of A can flow into the type of B.
 *
 * Strict matching: the types must be exactly equal.
 * Future: could add implicit conversions (e.g. percentage → number).
 */
export function areTypesCompatible(sourceType: DataType, targetType: DataType): TypeCheckResult {
  if (sourceType === targetType) {
    return { compatible: true };
  }

  return {
    compatible: false,
    reason: `Type mismatch: source port outputs "${sourceType}" but target port accepts "${targetType}"`,
  };
}

/**
 * Validates that a type value is a known DataType.
 * Use this when parsing untrusted input (e.g. plugin config, DTO).
 */
export function isValidDataType(value: unknown): value is DataType {
  if (typeof value !== 'string') return false;
  const VALID_TYPES = ['number', 'string', 'boolean', 'datetime', 'percentage', 'array', 'object'] as const;
  return (VALID_TYPES as readonly string[]).includes(value);
}

/**
 * Checks whether a type supports comparison operations (>, <, >=, <=).
 */
export function isComparableType(type: DataType): boolean {
  return COMPARABLE_TYPES.includes(type);
}

/**
 * Checks whether a type supports boolean/logic operations (AND, OR, NOT).
 */
export function isBooleanCompatible(type: DataType): boolean {
  return BOOLEAN_COMPATIBLE_TYPES.includes(type);
}

/**
 * Checks whether a type supports numeric operations (+, -, *, /, %).
 */
export function isNumericType(type: DataType): boolean {
  return NUMERIC_TYPES.includes(type);
}
