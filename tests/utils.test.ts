import { isPlainObject, joinPath, merge, parseQuery, pathToRegexp } from '../src/utils';

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

describe('joinPath', () => {
  test('joins multiple path segments correctly', () => {
    expect(joinPath('user', 'profile')).toBe('/user/profile');
  });
  test('handles empty segments', () => {
    expect(joinPath('', 'dashboard')).toBe('/dashboard');
  });
});

describe('pathToRegexp', () => {
  test('matches dynamic paths correctly', () => {
    const regex = pathToRegexp('/user/:id');
    expect('/user/123').toMatch(regex);
  });
  test('handles paths with regex patterns', () => {
    const regex = pathToRegexp('/page/(\\d+)');
    expect('/page/42').toMatch(regex);
  });
});

describe('parseQuery', () => {
  test('parses a query string into an object', () => {
    expect(parseQuery('name=John&age=30')).toEqual({ name: 'John', age: '30' });
  });
  test('parses URLSearchParams correctly', () => {
    const params = new URLSearchParams('foo=bar&baz=qux');
    expect(parseQuery(params)).toEqual({ foo: 'bar', baz: 'qux' });
  });
});
