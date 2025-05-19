import path from 'node:path';

const OBJECT_STRING = {}.toString();
const CTOR_STRING = Object.toString();

/**
 * Checks if the provided value is an object (excluding arrays and null).
 *
 * @param {any} item - The value to be checked.
 * @returns {boolean} Returns `true` if the item is a non-null object, otherwise `false`.
 */
export function isObject(item: any) {
  return item != null && typeof item == 'object' && Object.prototype.toString.call(item) == OBJECT_STRING;
}

/**
 * Checks if the given item is a plain object.
 * A plain object is an object created using `{}`, `new Object()`, or `Object.create(null)`.
 *
 * @param {any} item - The value to check.
 * @returns {boolean} - Returns `true` if the item is a plain object, otherwise `false`.
 */
export function isPlainObject(item: any): boolean {
  // not object-like null/undefined, not object returns a string
  if (!isObject(item)) return false;

  // the object is from Object.create(null)
  const proto = Object.getPrototypeOf(item);
  if (proto === null) return true;

  // an object created with the base Object constructor, for example: {} or new Object()
  const Ctor = Object.prototype.hasOwnProperty.call(proto, 'constructor') && proto.constructor;
  return typeof Ctor == 'function' && Ctor instanceof Ctor && Ctor.toString() == CTOR_STRING;
}

/**
 * Deeply merges multiple source objects into a target object - include array.
 *
 * @param {any} target - The target object to merge properties into.
 * @param {...any[]} sources - One or more source objects to merge from.
 * @returns {any} - The merged target object.
 */
export function merge(target: any, ...sources: any[]) {
  if (!sources.length) return target;

  for (const source of sources) {
    if (isPlainObject(target) && isPlainObject(source)) {
      for (const key in source) {
        const sourceValue = source[key];
        const targetValue = target[key];

        if (isPlainObject(sourceValue)) {
          target[key] = isPlainObject(targetValue) ? targetValue : {};
          merge(target[key], sourceValue);
        } else if (Array.isArray(sourceValue)) {
          target[key] = Array.isArray(targetValue) ? targetValue.concat(sourceValue) : [...sourceValue];
        } else {
          target[key] = sourceValue;
        }
      }
    }
  }

  return target;
}

/**
 * Deeply merges multiple source objects into a target object - only object.
 *
 * @param {any} target - The target object to merge properties into.
 * @param {...any[]} sources - One or more source objects to merge from.
 * @returns {any} - The merged target object.
 */
export function mergeObject(target: any, ...sources: any[]) {
  if (!sources.length) return target;

  for (const source of sources) {
    if (isPlainObject(target) && isPlainObject(source)) {
      for (const key in source) {
        const sourceValue = source[key];
        const targetValue = target[key];

        if (isPlainObject(sourceValue)) {
          target[key] = isPlainObject(targetValue) ? targetValue : {};
          merge(target[key], sourceValue);
        } else {
          target[key] = sourceValue;
        }
      }
    }
  }

  return target;
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
 * Supports path variables (e.g., "/user/[id]") and regex patterns.
 * @param routePath - The path string to convert.
 * @returns A RegExp object to match the given path pattern.
 */
export function pathToRegexp(routePath: string): RegExp {
  // Normalize route
  routePath = routePath.trim();

  // Remove group segments (e.g., (group))
  routePath = routePath.replace(/\/\(([^/]+?)\)/g, '');

  // Escape special regex characters
  let pattern = routePath.replace(/([.+?^=!:${}()|[\]/\\])/g, '\\$1');

  // Convert [name] to named capture groups
  pattern = pattern.replace(/\\\[(\w+?)\\\]/g, (_, key) => {
    return `(?<${key}>[^/]+)`;
  });

  // Optional catch-all: [[...param]]
  pattern = pattern.replace(/\\\/?\\\[\\\[\\\.\\\.\\\.(\w+?)\\\]\\\]/g, (_, key) => {
    return `(?:\/(?<${key}>.*))?`;
  });

  // Handle catch-all [...slug] by allowing anything after the segment
  pattern = pattern.replace(/\\\[\\\.\\\.\\\.(\w+?)\\\]/g, (_, key) => {
    return `(?<${key}>.+)`;
  });

  // Special case: allow optional trailing slash
  pattern = '^' + pattern.replace(/\/+$/, '') + '/?$';

  return new RegExp(pattern);
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

/**
 * Interpolates a template string by replacing placeholders with corresponding values from the provided variables.
 * Placeholders in the template should be enclosed in `{}` (e.g., `{variableName}`).
 * If a placeholder does not have a corresponding value in the variables object, it will be replaced with an empty string.
 *
 * @param {string} template - The template string containing placeholders to be replaced.
 * @param {Record<string, any>} variables - An object containing key-value pairs to replace placeholders in the template.
 * @returns {string} - The resulting string with placeholders replaced by corresponding values.
 *
 * @example
 * const result = interpolate('Hello, my name is {name} and I am {age} years old.', { name: 'Alice', age: 30 });
 * console.log(result); // "Hello, my name is Alice and I am 30 years old."
 */
export function interpolate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{(.*?)\}/g, (_, key) => {
    return key in variables ? variables[key] : '';
  });
}
