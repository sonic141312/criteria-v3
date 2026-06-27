import { ErrorCode } from './error-codes';

/**
 * Structured validation result returned by GraphValidator and plugin validate().
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  code: string;
  message: string;
}

/** Convenience: creates a successful ValidationResult */
export function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

/** Convenience: creates a failed ValidationResult with one error */
export function fail(code: string, message: string, nodeId?: string, edgeId?: string): ValidationResult {
  return {
    valid: false,
    errors: [{ code, message, nodeId, edgeId }],
  };
}

/** Combines multiple ValidationResults into one */
export function combine(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(r => r.errors);
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/** Adds errors to an existing result */
export function appendErrors(result: ValidationResult, ...errors: ValidationError[]): ValidationResult {
  return {
    valid: false,
    errors: [...result.errors, ...errors],
  };
}
