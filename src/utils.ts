import path from 'node:path';

/**
 * Checks if the provided value is an object (excluding arrays and null).
 *
 * @param {any} item - The value to be checked.
 * @returns {boolean} Returns `true` if the item is a non-null object, otherwise `false`.
 */
export function isObject(item: any) {
  return !!item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Checks if the given item is a plain object.
 * A plain object is an object created using `{}`, `new Object()`, or `Object.create(null)`.
 *
 * @param {any} item - The value to check.
 * @returns {boolean} - Returns `true` if the item is a plain object, otherwise `false`.
 */
export function isPlainObject(item: any) {
  return (
    !!item && // excludes null, undefined
    typeof item === 'object' && // excludes NaN
    [undefined, Object, Function].includes(item.constructor) // allows object, Object.create(...) and excludes any Constructor
  );
}

/**
 * Deeply merges multiple source objects into a target object.
 *
 * @param {any} target - The target object to merge properties into.
 * @param {...any[]} sources - One or more source objects to merge from.
 * @returns {any} - The merged target object.
 */
export function merge(target: any, ...sources: any[]) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isPlainObject(target) && isPlainObject(source)) {
    for (const key in source) {
      if (isPlainObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        if (!isPlainObject(target[key])) throw new Error(`Cannot merge source object with target in ${key}`);
        merge(target[key], source[key]);
      } else if (Array.isArray(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: [] });
        if (!Array.isArray(target[key])) throw new Error(`Cannot merge source array with target in ${key}`);
        target[key] = target[key].concat(source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return merge(target, ...sources);
}

/**
 * Joins multiple path segments into a single path, ensuring a leading slash.
 * @param args - The path segments to join.
 * @returns A joined path string.
 */
export function joinPath(...args: any[]) {
  return path.join('/', ...args.map((i) => i.toString()));
}

/**
 * Converts a custom path string into a regular expression for matching dynamic routes.
 * Supports path variables (e.g., "/user/:id") and regex patterns.
 * @param p - The path string to convert.
 * @returns A RegExp object to match the given path pattern.
 */
export function pathToRegexp(p: string) {
  const paths = [];
  let lastPath = '';
  let isVar = false;
  let varName = '';
  let rCount = 0;
  let rStr = '';

  p += '/';

  for (const c of p) {
    if (c === '/') {
      // regexp
      if (rStr) {
        lastPath += `(${rStr})`;
      }

      // add var
      if (isVar) {
        lastPath += `(?<${varName}>[^\/]+?)`;
      }

      // push
      paths.push(lastPath);

      // reset
      lastPath = '';
      varName = '';
      isVar = false;
      rStr = '';
      rCount = 0;
      continue;
    }

    // regex mode
    if (c === '(') {
      rCount++;
      if (rCount === 1) continue;
    }

    if (c === ')') {
      rCount = Math.max(0, rCount - 1);

      if (rCount === 0 && rStr) {
        lastPath += `(${rStr})`;

        rStr = '';
        continue;
      }
    }

    if (rCount > 0) {
      rStr += c;
      continue;
    }

    // var mode
    if (isVar && /[^\w]/.test(c)) {
      lastPath += `(?<${varName}>[^\/]+?)`;

      isVar = false;
      varName = '';
    }

    if (c === ':') {
      isVar = true;
      continue;
    }

    if (isVar) {
      varName += c;
      continue;
    }

    lastPath += c;
  }

  return new RegExp('^' + joinPath(...paths) + '/{0,1}$');
}

/**
 * Parses a query string or URLSearchParams object into a key-value object.
 * @param query - The query string or URLSearchParams object.
 * @returns An object containing query parameters as key-value pairs.
 */
export function parseQuery(query: URLSearchParams | string) {
  if (typeof query === 'string') query = new URLSearchParams(query);

  const res: any = {};
  for (const [key, value] of query) res[key] = value;

  return res;
}
