import { describe, expect, test } from 'vitest';
import { Container, Inject, Injectable, PARAMTYPE_METADATA } from '../src/di.js';

describe('Dependency Injection test', () => {
  test('how inheritance works?', async () => {
    function Human() {}
    function Engineer() {}

    Engineer.prototype = Object.create(Human.prototype);
    Engineer.prototype.constructor = Engineer;

    // @ts-ignore
    const engineer = new Engineer();
    expect(engineer.constructor).toBe(Engineer);
    expect(engineer.constructor.prototype).toBe(Engineer.prototype);
    expect(Object.getPrototypeOf(engineer)).toBeInstanceOf(Human);
    expect(Object.getPrototypeOf(Engineer.prototype)).toBe(Human.prototype);
  });

  test('create decorator', async () => {
    // @todo: vitest does not work with emitDecoratorMetadata
  });

  test('inheritance di', async () => {
    // @todo: vitest does not work with emitDecoratorMetadata
  });

  test('runtime decorator', async () => {
    const Abc = class {
      constructor(public data: string) {}
    };

    Injectable()(Abc);
    Inject('abc')(Abc, undefined, 0);
    Reflect.defineMetadata('design:paramtypes', [String], Abc);

    const container = new Container();

    container.register('abc', 'abc');
    container.register(Abc);

    const abc: any = container.resolve(Abc);
    expect(abc.data).toEqual('abc');
  });

  test('constructable', async () => {
    class A {}

    expect(Container.isConstructable(A)).toBe(true);
    expect(Container.isConstructable({})).toBe(false);
    expect(Container.isConstructable(new A())).toBe(false);
    expect(Container.isConstructable('abc')).toBe(false);
    expect(Container.isConstructable(123)).toBe(false);
    expect(Container.isConstructable(undefined)).toBe(false);
    expect(Container.isConstructable(null)).toBe(false);
    expect(Container.isConstructable(NaN)).toBe(false);
    expect(Container.isConstructable(Symbol())).toBe(false);
    expect(Container.isConstructable(() => {})).toBe(false);
  });

  test('function', async () => {
    class A {}

    expect(Container.isFunction(A)).toBe(false);
    expect(Container.isFunction({})).toBe(false);
    expect(Container.isFunction(new A())).toBe(false);
    expect(Container.isFunction('abc')).toBe(false);
    expect(Container.isFunction(123)).toBe(false);
    expect(Container.isFunction(undefined)).toBe(false);
    expect(Container.isFunction(null)).toBe(false);
    expect(Container.isFunction(NaN)).toBe(false);
    expect(Container.isConstructable(Symbol())).toBe(false);
    expect(Container.isFunction(() => {})).toBe(true);
  });

  test('register & resolve', async () => {
    // @todo: vitest does not work with emitDecoratorMetadata
  });

  test('inject error', async () => {
    // @todo: vitest not working
    // @Injectable()
    // class A {
    //   msg: string;
    //   constructor(a) {}
    // }
    // @Injectable()
    // class B {
    //   constructor(@Inject('c') c) {}
    // }
    // class C {}
    // const container = new Container();
    // expect(() => container.resolve(A)).toThrow('A > Object is not injectable.');
    // expect(() => container.resolve(B)).toThrow(`B > c wasn't injected`);
    // expect(() => container.resolve(C)).toThrow('C is not injectable.');
  });

  test('circular error', async () => {
    // @todo: vitest does not work with emitDecoratorMetadata
  });

  test('execute', async () => {
    // @todo: vitest does not work with emitDecoratorMetadata
  });

  test('interface register', async () => {
    interface CalcService {
      add(x: number, y: number): number;
    }

    @Injectable()
    class CalcServiceMachine implements CalcService {
      add(x: number, y: number): number {
        return x + y;
      }
    }

    const container = new Container();
    container.register('CalcService', CalcServiceMachine);

    const calcService = container.resolve<CalcService>('CalcService');

    expect(calcService.add(1, 1)).toEqual(2);
  });

  test('di without decorator', async () => {
    class A {
      public name: string = 'a';
    }

    class B {
      public name: string = 'b';
      constructor(private a: A) {}

      msg() {
        return `Hello ${this.name} -> ${this.a.name}`;
      }
    }

    const container = new Container();
    container.register(A, undefined, { params: [] });
    container.register(B, undefined, { params: [A] });

    expect(container.resolve<B>(B).msg()).toEqual('Hello b -> a');
  });

  test('mock components', async () => {
    // normal register
    @Injectable()
    class clsA {
      public name;
      constructor() {
        this.name = 'main a';
      }
    }

    const container = new Container();
    container.register(clsA);

    const insA = container.resolve<clsA>(clsA);
    expect(insA).toHaveProperty('name', 'main a');

    // mock class
    @Injectable()
    class clsMockA {
      public name;
      constructor() {
        this.name = 'mock a';
      }
    }
  });
});
