import { isPlainObject, merge } from '../src/utils';

describe('isPlainObject', () => {
  it('should return true for an empty object', () => {
    expect(isPlainObject({})).toBe(true);
  });

  it('should return true for an object created with new Object()', () => {
    expect(isPlainObject(new Object())).toBe(true);
  });

  it('should return true for an object created with Object.create(null)', () => {
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it('should return false for an array', () => {
    expect(isPlainObject([])).toBe(false);
  });

  it('should return false for a function', () => {
    expect(isPlainObject(() => {})).toBe(false);
  });

  it('should return false for null', () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it('should return false for a primitive value', () => {
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject('string')).toBe(false);
    expect(isPlainObject(true)).toBe(false);
  });
});

describe('merge', () => {
  it('should merge two objects correctly', () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const result = merge(target, source);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('should merge multiple objects correctly', () => {
    const target = { a: 1, b: 2 };
    const source1 = { b: 3, c: 4 };
    const source2 = { c: 5, d: 6 };
    const result = merge(target, source1, source2);

    expect(result).toEqual({ a: 1, b: 3, c: 5, d: 6 });
  });

  it('should handle nested objects', () => {
    const target = { a: { x: 1 } };
    const source = { a: { y: 2 }, b: 3 };
    const result = merge(target, source);

    expect(result).toEqual({ a: { x: 1, y: 2 }, b: 3 });
  });

  it('should throw error when merging incompatible types', () => {
    const target = { a: 1 };
    const source = { a: [1, 2] };

    expect(() => merge(target, source)).toThrow('Cannot merge source array with target in a');
  });

  it('should throw error if merging object with array', () => {
    const target = { a: {} };
    const source = { a: [] };

    expect(() => merge(target, source)).toThrow('Cannot merge source array with target in a');
  });

  it('should handle deep merge with arrays', () => {
    const target = { a: [1, 2] };
    const source = { a: [3, 4] };
    const result = merge(target, source);

    expect(result).toEqual({ a: [1, 2, 3, 4] });
  });

  it('should not mutate the original objects', () => {
    const target = { a: 1 };
    const source = { b: 2 };
    const targetCopy = { ...target };
    const sourceCopy = { ...source };

    merge({}, target, source);

    expect(target).toEqual(targetCopy);
    expect(source).toEqual(sourceCopy);
  });
});
