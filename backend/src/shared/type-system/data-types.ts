/**
 * Supported data types for ports and fields.
 * Extensible — new types can be added without breaking existing plugins.
 */
export const DATA_TYPES = [
  'number',
  'string',
  'boolean',
  'datetime',
  'percentage',
  'array',
  'object',
] as const;

export type DataType = (typeof DATA_TYPES)[number];

/**
 * All types that are "numeric" in the engine sense — support math operations.
 */
export const NUMERIC_TYPES: readonly DataType[] = ['number', 'percentage'];

/**
 * All types that are "comparable" — support comparison operations.
 */
export const COMPARABLE_TYPES: readonly DataType[] = ['number', 'percentage', 'string', 'datetime', 'boolean'];

/**
 * All types that are "boolean-compatible" — result of logic operations.
 */
export const BOOLEAN_COMPATIBLE_TYPES: readonly DataType[] = ['boolean'];
