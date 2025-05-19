import { joinPath, merge, pathToRegexp, parseQuery, isPlainObject, isObject, interpolate } from '../src/utils';

describe('Utils test', () => {
  it('should join path', async () => {
    expect(joinPath(1, 2, 3)).toEqual('/1/2/3');
    expect(joinPath('a', '/', 'b')).toEqual('/a/b');
    expect(joinPath('/', 'a', '/', 'b')).toEqual('/a/b');
  });

  it('should parse query', async () => {
    const query = parseQuery('foo[0][xyz][ghi]=bar&foo[1]=abc');
    expect(query).toEqual({ 'foo[0][xyz][ghi]': 'bar', 'foo[1]': 'abc' });
  });
});

describe('merge', () => {
  it('should returns target when no sources are provided', () => {
    const target = { a: 1 };
    expect(merge(target)).toEqual({ a: 1 });
  });

  it('should merges plain objects correctly', () => {
    const target = { a: 1 };
    const source = { b: 2 };
    expect(merge(target, source)).toEqual({ a: 1, b: 2 });
  });

  it('should deep merges nested objects', () => {
    const target = { a: { b: 1 } };
    const source = { a: { c: 2 } };
    expect(merge(target, source)).toEqual({ a: { b: 1, c: 2 } });
  });

  it('should merges arrays by concatenation', () => {
    const target = { a: [1] };
    const source = { a: [2, 3] };
    expect(merge(target, source)).toEqual({ a: [1, 2, 3] });
  });

  it('should merges multiple sources sequentially', () => {
    const target = { a: 1 };
    const source1 = { b: 2 };
    const source2 = { c: 3 };
    expect(merge(target, source1, source2)).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('should merge object into non-object', () => {
    const target = { a: 1 };
    const source = { a: { b: 2 } }; // trying to merge object into number
    expect(merge(target, source)).toEqual({ a: { b: 2 } });
  });

  it('should merge array into non-array', () => {
    const target = { a: 1 };
    const source = { a: [1, 2] }; // trying to merge array into number
    expect(merge(target, source)).toEqual({ a: [1, 2] });
  });

  it('should creates new objects/arrays if not present in target', () => {
    const target: any = {};
    const source = {
      obj: { a: 1 },
      arr: [1, 2],
    };
    expect(merge(target, source)).toEqual({
      obj: { a: 1 },
      arr: [1, 2],
    });
  });

  it('should merge', async () => {
    expect(merge({ a: 1, c: { d: 1 } }, { a: 2, b: [1, 2] }, { b: [3] }, { c: { d: 2 } })).toEqual({
      a: 2,
      b: [1, 2, 3],
      c: { d: 2 },
    });

    expect(merge({ a: 1, b: {}, c: { d: 1 } }, { a: 2, b: [1, 2] }, { b: [3] }, { c: { d: 2 } })).toEqual({
      a: 2,
      b: [1, 2, 3],
      c: { d: 2 },
    });

    expect(merge({ a: 1, c: { d: 1 } }, { a: 2, b: [1, 2] }, { b: [3] }, { c: { d: {} } })).toEqual({
      a: 2,
      b: [1, 2, 3],
      c: { d: {} },
    });
  });
});

describe('pathToRegexp', () => {
  it('should handle static routes', () => {
    expect('/abc/def.html').toMatch(pathToRegexp('/abc/def.html'));
    expect('/abc/def').not.toMatch(pathToRegexp('/abc/def.html'));
    expect('/abc/def.html/ghi.html').not.toMatch(pathToRegexp('/abc/def.html'));
  });

  it('should handle dynamic routes', () => {
    expect('/abc/red-blue/image.png'.match(pathToRegexp('/abc/[tag]-[group]/[name].[ext]'))?.groups).toEqual({
      tag: 'red',
      group: 'blue',
      name: 'image',
      ext: 'png',
    });

    expect('/abc/def.html').not.toMatch(pathToRegexp('/abc[slug]'));
  });

  it('should handle group routes', () => {
    expect('/abc/def.html').toMatch(pathToRegexp('/abc/(group)/def.html'));
    expect('/abc/group/def.html').not.toMatch(pathToRegexp('/abc/(group)/def.html'));

    expect('/abc//def.html').not.toMatch(pathToRegexp('/abc/(group)/def.html'));
  });

  it('should Catch-all routes', () => {
    expect('/abc/a/b/c'.match(pathToRegexp('/abc/[...slug]'))?.groups).toEqual({ slug: 'a/b/c' });
    expect('/abc/a/b/c'.match(pathToRegexp('/abc[...slug]'))?.groups).toEqual({ slug: '/a/b/c' });
    expect('/abc-a/b/c'.match(pathToRegexp('/abc[...slug]'))?.groups).toEqual({ slug: '-a/b/c' });

    expect('/abc/def/'.match(pathToRegexp('/abc/[[...slug]]'))?.groups).toEqual({ slug: 'def/' });
    expect('/abc/'.match(pathToRegexp('/abc/[[...slug]]'))?.groups).toEqual({ slug: '' });
    expect('/abc'.match(pathToRegexp('/abc/[[...slug]]'))?.groups).toEqual({ slug: undefined });

    expect('/abc').not.toMatch(pathToRegexp('/abc/[...slug]'));
  });

  it('should handle optional trailing slash', () => {
    expect('').toMatch(pathToRegexp(''));
    expect('').toMatch(pathToRegexp('/'));
    expect('/').toMatch(pathToRegexp(''));
    expect('///').toMatch(pathToRegexp('///'));

    expect('/abc').toMatch(pathToRegexp('/abc/'));
    expect('/abc/').toMatch(pathToRegexp('/abc/'));
    expect('/abc/').toMatch(pathToRegexp('/abc'));
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

describe('interpolate', () => {
  it('should replace variables with correct values', () => {
    const template = 'Hello, my name is {name} and I am {age} years old.';
    const variables = { name: 'Alice', age: 30 };

    const result = interpolate(template, variables);
    expect(result).toBe('Hello, my name is Alice and I am 30 years old.');
  });

  it('should return empty string for missing variables', () => {
    const template = 'Hello, my name is {name} and I am {age} years old.';
    const variables = { name: 'Alice' }; // age is missing

    const result = interpolate(template, variables);
    expect(result).toBe('Hello, my name is Alice and I am  years old.');
  });

  it('should return the template if no variables are provided', () => {
    const template = 'Hello, my name is {name} and I am {age} years old.';
    const variables = {};

    const result = interpolate(template, variables);
    expect(result).toBe('Hello, my name is  and I am  years old.');
  });

  it('should handle empty template string', () => {
    const template = '';
    const variables = { name: 'Alice', age: 30 };

    const result = interpolate(template, variables);
    expect(result).toBe('');
  });

  it('should handle missing curly braces', () => {
    const template = 'Hello, my name is name and I am age years old.';
    const variables = { name: 'Alice', age: 30 };

    const result = interpolate(template, variables);
    expect(result).toBe('Hello, my name is name and I am age years old.');
  });

  it('should handle complex expressions inside variables', () => {
    const template = 'The result of 2 + 2 is {result}.';
    const variables = { result: 2 + 2 };

    const result = interpolate(template, variables);
    expect(result).toBe('The result of 2 + 2 is 4.');
  });
});
