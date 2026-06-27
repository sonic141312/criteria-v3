export { DATA_TYPES, NUMERIC_TYPES, COMPARABLE_TYPES, BOOLEAN_COMPATIBLE_TYPES } from './data-types';
export type { DataType } from './data-types';

export { Port, PortMap } from './port';

export {
  areTypesCompatible,
  isValidDataType,
  isComparableType,
  isBooleanCompatible,
  isNumericType,
} from './type-compatibility';
export type { TypeCheckResult } from './type-compatibility';
