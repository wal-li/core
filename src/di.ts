import 'reflect-metadata';
import { merge } from './utils';

type Constructable<T = {}> = new (...args: any[]) => T;

type InjectionToken<T = any> = Constructable<T> | Function | string | symbol;

type ItemOptions = {
  undefined?: boolean;
  params?: any[];
};

type RegistrationItem = {
  token: InjectionToken;
  provider: any;
  value?: any;
  options: ItemOptions;
  dependencies: InjectionToken[];
};

class Decorator extends Function {
  readonly key!: Symbol;
}

type ExecutionSession = {
  decorator: Decorator;
  runningItems: InjectionToken[];
  input: Record<string, any>;
  output: Record<string, any>;
};

const INJECTION_SYMBOL = Symbol();
const PARAMTYPE_METADATA = 'design:paramtypes';

class Container {
  /**
   * Creates a new decorator instance with an optional unique key.
   *
   * @param {Symbol} [key] - An optional unique symbol to identify the decorator.
   * @returns {Decorator} - The created decorator instance.
   */
  static createDecorator(key?: Symbol): Decorator {
    if (!key) key = Symbol();

    const de = function (...args: any[]) {
      return (target: any, property?: any, index?: any) => {
        /**
         * [class] undefined undefined: class decorator
         * [class] undefined 0: constructor argument decorator
         * {} log undefined: method decorator, {} is class prototype
         * {} log index: method argument decorator, {} is class prototype
         */
        const meta = Reflect.getOwnMetadata(key, target, property) || {};

        if (typeof index !== 'number') index = undefined;

        meta[`${index}`] = args;

        Reflect.defineMetadata(key, meta, target, property);
      };
    };

    de.key = key;

    return de;
  }

  /**
   * Retrieves the metadata value associated with a given key from a class or its method.
   *
   * @param key - The metadata key (symbol) to look up.
   * @param target - The class or constructor function from which to retrieve metadata.
   * @param property - (Optional) The property name of a class method, if retrieving method-level metadata.
   * @returns The metadata value associated with the key, or `undefined` if not found.
   */
  static getMetadata(key: Symbol | string, target: Constructable, property?: any) {
    // get method decorator
    if (property !== undefined) target = target.prototype;

    return Reflect.getMetadata(key, target, property);
  }

  /**
   * Retrieves a list of all method names from a given class, including inherited methods.
   *
   * @param target - The class or constructor function to extract methods from.
   * @returns An array of unique method names, excluding the constructor.
   */
  static listAllMethods(target: Constructable): string[] {
    let current = target.prototype;
    const methods = [];
    while (current !== Object.prototype) {
      methods.unshift(...Object.getOwnPropertyNames(current));
      current = Object.getPrototypeOf(current);
    }
    return Array.from(new Set(methods.map((name) => name as string).filter((name) => name !== 'constructor')));
  }

  /**
   * Retrieves a list of method names from a class that have metadata associated with a specified symbol key.
   *
   * @param key - The metadata key (symbol) used to filter methods.
   * @param target - The class or constructor function to search for decorated methods.
   * @returns An array of method names that have metadata associated with the given key.
   */
  static listDecoratorMethods(key: Symbol, target: Constructable): string[] {
    return this.listAllMethods(target).filter((name) => Reflect.hasMetadata(key, target.prototype, name));
  }

  /**
   * Checks if an object is a constructable class.
   *
   * @param obj - The object to check.
   * @returns `true` if the object is a class (has a prototype and is a function), otherwise `false`.
   */
  static isConstructable(obj: any): boolean {
    return obj?.prototype !== undefined && obj instanceof Function;
  }

  /**
   * Checks if an object is a regular function (not a class).
   *
   * @param obj - The object to check.
   * @returns `true` if the object is a function but not a class, otherwise `false`.
   */
  static isFunction(obj: any): boolean {
    return obj?.prototype === undefined && obj instanceof Function;
  }

  /**
   * Retrieves the name of an injection token.
   *
   * @param token - The injection token, which can be a string, symbol, or constructor function.
   * @returns The token name as a string, or `'symbol'` if the token is a symbol.
   */
  static getName(token: InjectionToken): string {
    if (typeof token === 'string') return token;
    if (typeof token === 'symbol') return 'symbol';
    return token.name;
  }

  private registrationItems: RegistrationItem[] = [];
  private resolveTokenStack: InjectionToken[] = [];

  /**
   * Registers a provider with an injection token in the container.
   *
   * @param token - The injection token, which can be a string, symbol, or constructor function.
   * @param provider - (Optional) The provider instance or constructor to associate with the token.
   * @param options - (Optional) Additional configuration options for the registration.
   * @returns The created registration item.
   */
  register(token: InjectionToken, provider?: any, options?: ItemOptions): RegistrationItem {
    const item: RegistrationItem = {
      token,
      provider,
      options: {
        undefined: false,
        ...options,
      },
      dependencies: [],
    };

    if (item.provider === undefined && Container.isConstructable(token)) item.provider = token;

    this.registrationItems.push(item);

    return item;
  }

  /**
   * Retrieves a registered item associated with the given injection token.
   *
   * @param token - The injection token used to find the corresponding registration item.
   * @returns The matching registration item if found, otherwise `undefined`.
   */
  getRegistrationItem(token: InjectionToken): RegistrationItem | undefined {
    for (const item of this.registrationItems) {
      if (item.token === token) {
        return item;
      }
    }
  }

  /**
   * Resolves a dependency based on the given injection token.
   *
   * @template T - The expected type of the resolved dependency.
   * @param {InjectionToken} token - The injection token used to identify the dependency.
   * @returns {T} - The resolved instance of the dependency.
   * @throws {Error} - Throws an error if the dependency cannot be resolved.
   */
  resolveItem<T>(token: InjectionToken): T {
    // find registered item
    let currentItem = this.getRegistrationItem(token);

    // register item if not exists
    if (currentItem === undefined) currentItem = this.register(token);

    // return available value
    if (currentItem.value !== undefined) return currentItem.value;

    // token path
    const tokenPath = [...this.resolveTokenStack, token].map((t) => Container.getName(t)).join(' > ');

    // resolve constructable item
    if (Container.isConstructable(currentItem.provider)) {
      // circular detection
      if (this.resolveTokenStack.indexOf(token) !== -1)
        throw new Error(`Circular dependencies dection at ${tokenPath}`);
      this.resolveTokenStack.push(token);

      // prepare
      const params = [];

      // get metadata from @Injectable & @Inject
      const meta = Container.getMetadata(INJECTION_SYMBOL, currentItem.provider);

      // not injectable and not param definitions
      if (meta === undefined && !currentItem.options.params) throw new Error(`${tokenPath} is not injectable.`);

      // get constructor param types: options.params > self define > empty
      const paramTypes =
        currentItem.options.params || Container.getMetadata(PARAMTYPE_METADATA, currentItem.provider) || [];

      for (let index = 0; index < paramTypes.length; index++) {
        if (meta?.[index] !== undefined) paramTypes[index] = meta[index][0];

        currentItem.dependencies.push(paramTypes[index]);

        // Check if the parameter allows undefined resolution based on `meta[index][1]`
        if (meta?.[index]?.[1]?.undefined) {
          // Try to resolve the item using `this.resolveItem` and assign it to `params[index]`
          try {
            params[index] = this.resolveItem(paramTypes[index]);
          } catch {
            // If something goes wrong during the resolution, return `undefined` for `params[index]`
            params[index] = undefined;
          }
        } else {
          // For normal resolution (not allowing undefined), resolve the item directly and assign it
          // Throw an error if something goes wrong during resolution (it will be caught elsewhere)
          params[index] = this.resolveItem(paramTypes[index]);
        }
      }

      currentItem.value = new currentItem.provider(...params);

      // release circular detection
      this.resolveTokenStack.pop();
    }
    // resolve value item
    else currentItem.value = currentItem.provider;

    // fallback
    if (!currentItem.options.undefined && currentItem.value === undefined)
      throw new Error(`${tokenPath} wasn't injected`);

    return currentItem.value;
  }

  /**
   * Resolves a dependency based on the given injection token, with an optional proxy function.
   *
   * @template T - The expected type of the resolved dependency.
   * @param {InjectionToken} token - The injection token used to identify the dependency.
   * @param {Function} [proxyFn] - An optional function to proxy or modify the resolved instance.
   * @returns {T} - The resolved instance of the dependency.
   * @throws {Error} - Throws an error if the dependency cannot be resolved.
   */
  resolve<T>(token: InjectionToken, proxyFn?: Function): T {
    this.resolveTokenStack = [];
    const value: T = this.resolveItem(token);

    // normal return
    if (!proxyFn) return value;

    return new Proxy(
      {},
      {
        get(target, prop, receiver) {
          return proxyFn(value)[prop];
        },
        set(target, prop, newVal, receiver) {
          return (proxyFn(value)[prop] = newVal);
        },
      },
    ) as T;
  }

  /**
   * Executes a task associated with the given injection token within the provided execution session.
   *
   * @param {ExecutionSession} session - The execution session in which the item will be executed.
   * @param {InjectionToken} token - The injection token identifying the item to execute.
   * @returns {Promise<any>} - A promise that resolves with the execution result.
   * @throws {Error} - Throws an error if execution fails.
   */
  async executeItem(session: ExecutionSession, token: InjectionToken) {
    // get item and check valid
    const currentItem = this.getRegistrationItem(token);
    if (!currentItem || !Container.isConstructable(currentItem.provider)) return;

    // resolve unsolved item
    if (currentItem.value === undefined) this.resolve(token);
    // start run
    if (session.runningItems.indexOf(token) !== -1) return;
    session.runningItems.push(token);

    // run dependencies
    for (const depToken of currentItem.dependencies) await this.executeItem(session, depToken);

    // list all methods
    const methods: string[] = Container.listDecoratorMethods(session.decorator.key, currentItem.provider);
    for (const method of methods) {
      const params = [];

      const meta = Container.getMetadata(INJECTION_SYMBOL, currentItem.provider, method) || [];

      const paramTypes = Reflect.getMetadata(PARAMTYPE_METADATA, currentItem.provider.prototype, method);

      for (let index = 0; index < paramTypes.length; index++) {
        let paramType = paramTypes[index];
        if (meta[index] !== undefined) paramType = meta[index][0];

        currentItem.dependencies.push(paramType);
        params[index] = this.resolveItem(paramType);
        await this.executeItem(session, paramType);
      }

      merge(session.output, await currentItem.value[method](...params));
    }
  }

  /**
   * Executes a decorated function with optional input parameters and dependency resolution.
   *
   * @param {Decorator} decorator - The decorator that modifies or enhances the execution.
   * @param {Record<string, any>} [input] - Optional input parameters for execution.
   * @param {boolean} [deps] - Whether to resolve dependencies before execution (default: `false`).
   * @returns {Promise<Record<string, any>>} - A promise that resolves with the execution result.
   * @throws {Error} - Throws an error if execution fails.
   */
  async execute(decorator: Decorator, input?: Record<string, any>, deps?: boolean): Promise<Record<string, any>> {
    const session: ExecutionSession = {
      runningItems: [],
      decorator,
      input: input || {},
      output: {},
    };

    for (const item of this.registrationItems) {
      await this.executeItem(session, item.token);
    }

    return session.output;
  }
}

// core decorators
const Injectable = Container.createDecorator(INJECTION_SYMBOL);
const Inject = Container.createDecorator(INJECTION_SYMBOL);

export { Container, Injectable, Inject, INJECTION_SYMBOL, PARAMTYPE_METADATA };
export type { Constructable };
