/**
 * Checks if the given item is a plain object.
 * A plain object is an object created using `{}`, `new Object()`, or `Object.create(null)`.
 *
 * @param {any} item - The value to check.
 * @returns {boolean} - Returns `true` if the item is a plain object, otherwise `false`.
 */
export function isPlainObject(item: any) {
  return (
    !!item &&
    typeof item === 'object' &&
    !Array.isArray(item) && // not array
    (Object.getPrototypeOf(item) === Object.prototype || // Check if the object is created by {} or new Object()
      Object.getPrototypeOf(item) === null) // Check if the object is created by Object.create(null)
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
