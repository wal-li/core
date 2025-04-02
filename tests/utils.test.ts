import { joinPath, merge, pathToRegexp, parseQuery, isPlainObject, isObject } from '../src/utils';

describe('Utils test', () => {
  test('merge', async () => {
    expect(merge({ a: 1, c: { d: 1 } }, { a: 2, b: [1, 2] }, { b: [3] }, { c: { d: 2 } })).toEqual({
      a: 2,
      b: [1, 2, 3],
      c: { d: 2 },
    });

    expect(() => merge({ a: 1, b: {}, c: { d: 1 } }, { a: 2, b: [1, 2] }, { b: [3] }, { c: { d: 2 } })).toThrow(
      'Cannot merge source array with target in b',
    );

    expect(() => merge({ a: 1, c: { d: 1 } }, { a: 2, b: [1, 2] }, { b: [3] }, { c: { d: {} } })).toThrow(
      'Cannot merge source object with target in d',
    );
  });

  test('join path', async () => {
    expect(joinPath(1, 2, 3)).toEqual('/1/2/3');
    expect(joinPath('a', '/', 'b')).toEqual('/a/b');
    expect(joinPath('/', 'a', '/', 'b')).toEqual('/a/b');
  });

  test('path to regex', async () => {
    expect('/').toMatch(pathToRegexp('/'));
    expect('/abc').toMatch(pathToRegexp('/abc'));
    expect('/abc').toMatch(pathToRegexp('/abc/'));
    expect('/abc/').toMatch(pathToRegexp('/abc'));
    expect('/abc/').toMatch(pathToRegexp('/abc/'));
    expect('/abc').toMatch(pathToRegexp('/:id'));
    expect('/next-abc.html').toMatch(pathToRegexp('/next-:id.html'));
    expect('/ab:cd').toMatch(pathToRegexp('/a(.:.)d'));
    expect('/ab:c').toMatch(pathToRegexp('/a(.:.'));

    expect(pathToRegexp('/:id').exec('/abc')?.groups).toHaveProperty('id', 'abc');
    expect(pathToRegexp('/next-:id.html').exec('/next-abc.html')?.groups).toHaveProperty('id', 'abc');
    expect(pathToRegexp('/a(.:.)d').exec('/ab:cd')).toHaveProperty('1', 'b:c');
    expect(pathToRegexp('/a(?<msg>.:.)d').exec('/ab:cd')?.groups).toHaveProperty('msg', 'b:c');

    expect('').not.toMatch(pathToRegexp('/'));
    expect('/').not.toMatch(pathToRegexp('/abc'));
    expect('/abc').not.toMatch(pathToRegexp('/'));
    expect('/abc/def').not.toMatch(pathToRegexp('/:id'));
  });

  test('parse query', async () => {
    const query = parseQuery('foo[0][xyz][ghi]=bar&foo[1]=abc');
    expect(query).toEqual({ 'foo[0][xyz][ghi]': 'bar', 'foo[1]': 'abc' });
  });
});

describe('isPlainObject', () => {
  it('should return true for plain objects', () => {
    const result = isPlainObject({});
    expect(result).toBe(true);
  });

  it('should return false for arrays', () => {
    const result = isPlainObject([]);
    expect(result).toBe(false);
  });

  it('should return false for null', () => {
    const result = isPlainObject(null);
    expect(result).toBe(false);
  });

  it('should return false for a number', () => {
    const result = isPlainObject(42);
    expect(result).toBe(false);
  });

  it('should return false for a string', () => {
    const result = isPlainObject('hello');
    expect(result).toBe(false);
  });

  it('should return false for a boolean', () => {
    const result = isPlainObject(true);
    expect(result).toBe(false);
  });

  it('should return false for a date object', () => {
    const result = isPlainObject(new Date());
    expect(result).toBe(false);
  });

  it('should return false for a function', () => {
    const result = isPlainObject(() => {});
    expect(result).toBe(false);
  });

  it('should return false for a custom object with a constructor other than Object', () => {
    function Custom() {}
    const result = isPlainObject(new Custom());
    expect(result).toBe(false);
  });

  it('should return false for undefined', () => {
    const result = isPlainObject(undefined);
    expect(result).toBe(false);
  });

  it('should return true for a plain object created using Object.create(null)', () => {
    const result = isPlainObject(Object.create(null));
    expect(result).toBe(true);
  });
});

describe('isObject', () => {
  it('should return true for non-null objects', () => {
    expect(isObject({})).toBe(true); // Empty object
    expect(isObject({ key: 'value' })).toBe(true); // Object with properties
  });

  it('should return false for arrays', () => {
    expect(isObject([])).toBe(false); // Empty array
    expect(isObject([1, 2, 3])).toBe(false); // Array with elements
  });

  it('should return false for null', () => {
    expect(isObject(null)).toBe(false); // Null value
  });

  it('should return false for primitive types', () => {
    expect(isObject('string')).toBe(false); // String
    expect(isObject(42)).toBe(false); // Number
    expect(isObject(true)).toBe(false); // Boolean
    expect(isObject(undefined)).toBe(false); // Undefined
  });

  it('should return false for functions', () => {
    expect(isObject(() => {})).toBe(false); // Function
  });
});
