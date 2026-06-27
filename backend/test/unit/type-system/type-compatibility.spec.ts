import {
  areTypesCompatible,
  isValidDataType,
  isComparableType,
  isBooleanCompatible,
  isNumericType,
  DATA_TYPES,
} from '@shared/type-system';

describe('DataType constants', () => {
  it('should have all expected types', () => {
    expect(DATA_TYPES).toContain('number');
    expect(DATA_TYPES).toContain('string');
    expect(DATA_TYPES).toContain('boolean');
    expect(DATA_TYPES).toContain('datetime');
    expect(DATA_TYPES).toContain('percentage');
    expect(DATA_TYPES).toContain('array');
    expect(DATA_TYPES).toContain('object');
    expect(DATA_TYPES).toHaveLength(7);
  });
});

describe('areTypesCompatible', () => {
  it('should return compatible for identical types', () => {
    for (const type of DATA_TYPES) {
      const result = areTypesCompatible(type, type);
      expect(result.compatible).toBe(true);
    }
  });

  it('should return incompatible for different types', () => {
    const pairs: Array<[string, string]> = [
      ['number', 'string'],
      ['boolean', 'number'],
      ['percentage', 'boolean'],
      ['array', 'object'],
    ];
    for (const [a, b] of pairs) {
      const result = areTypesCompatible(a as never, b as never);
      expect(result.compatible).toBe(false);
      expect(result.reason).toBeDefined();
    }
  });
});

describe('isValidDataType', () => {
  it('should return true for valid data types', () => {
    for (const type of DATA_TYPES) {
      expect(isValidDataType(type)).toBe(true);
    }
  });

  it('should return false for invalid values', () => {
    expect(isValidDataType('unknown')).toBe(false);
    expect(isValidDataType('')).toBe(false);
    expect(isValidDataType(null)).toBe(false);
    expect(isValidDataType(undefined)).toBe(false);
    expect(isValidDataType(123)).toBe(false);
    expect(isValidDataType({})).toBe(false);
  });
});

describe('isComparableType', () => {
  it('should return true for comparable types', () => {
    expect(isComparableType('number')).toBe(true);
    expect(isComparableType('percentage')).toBe(true);
    expect(isComparableType('string')).toBe(true);
    expect(isComparableType('datetime')).toBe(true);
    expect(isComparableType('boolean')).toBe(true);
  });

  it('should return false for non-comparable types', () => {
    expect(isComparableType('array')).toBe(false);
    expect(isComparableType('object')).toBe(false);
  });
});

describe('isBooleanCompatible', () => {
  it('should return true only for boolean', () => {
    expect(isBooleanCompatible('boolean')).toBe(true);
    expect(isBooleanCompatible('number')).toBe(false);
    expect(isBooleanCompatible('string')).toBe(false);
  });
});

describe('isNumericType', () => {
  it('should return true for numeric types', () => {
    expect(isNumericType('number')).toBe(true);
    expect(isNumericType('percentage')).toBe(true);
  });

  it('should return false for non-numeric types', () => {
    expect(isNumericType('string')).toBe(false);
    expect(isNumericType('boolean')).toBe(false);
    expect(isNumericType('array')).toBe(false);
  });
});
