import { Container, Inject, Injectable } from '../src/di';

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
    const DEFAULT_METADATA = Symbol();

    const HookClass = Container.createDecorator(DEFAULT_METADATA);
    const HookMethod = Container.createDecorator(DEFAULT_METADATA);
    const HookParam = Container.createDecorator(DEFAULT_METADATA);

    @HookClass('parentclass', 1)
    class ParentClass {
      @HookMethod('say', 2)
      say(@HookParam('a', 3) a: any) {}
    }

    @HookClass('someclass', 1)
    class SomeClass extends ParentClass {
      @HookMethod('log', 2)
      log(parent: ParentClass) {}

      extra() {}
    }

    expect(Container.getMetadata(DEFAULT_METADATA, SomeClass)).not.toBe(undefined);
    expect(Container.getMetadata(DEFAULT_METADATA, SomeClass, 'log')).not.toBe(undefined);
    expect(Container.getMetadata(DEFAULT_METADATA, SomeClass, 'say')).not.toBe(undefined);
    expect(Container.getMetadata(DEFAULT_METADATA, SomeClass, 'say')[0]).not.toBe(undefined);

    expect(Container.listAllMethods(SomeClass)).toEqual(['say', 'log', 'extra']);
    expect(Container.listDecoratorMethods(DEFAULT_METADATA, SomeClass)).toEqual(['say', 'log']);

    expect(Container.getMetadata('design:paramtypes', SomeClass, 'log')[0]).toEqual(ParentClass);
  });

  test('inheritance di', async () => {
    @Injectable()
    class Abc {
      protected msg;

      constructor(@Inject('abc') abc: string) {
        this.msg = abc;
      }

      print() {
        return this.msg;
      }
    }

    @Injectable()
    class Def extends Abc {
      constructor(@Inject('def') def: string) {
        super(def);
      }
    }

    @Injectable()
    class Ghi extends Abc {
      constructor(@Inject('ghi') ghi: string) {
        super(ghi);
      }
    }

    const container = new Container();

    container.register('abc', 'abc');
    container.register('def', 'def');
    container.register('ghi', 'ghi');

    expect(container.resolve<Abc>(Ghi).print()).toEqual('ghi');
    expect(container.resolve<Abc>(Def).print()).toEqual('def');
    expect(container.resolve<Abc>(Abc).print()).toEqual('abc');
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
    @Injectable()
    class B {
      first: string;
      constructor() {
        this.first = 'hello, ';
      }
    }

    @Injectable()
    class A {
      msg: string;

      constructor(b: B, @Inject('name') a) {
        this.msg = b.first + a;
      }
    }

    const container = new Container();
    const sym = Symbol();

    container.register('name', 'foo');
    container.register('age', undefined, { undefined: true });
    container.register(sym, undefined, { undefined: true });

    container.register(A);

    expect(container.resolve('name')).toBe('foo');
    expect(container.resolve('age')).toBe(undefined);
    expect(() => container.resolve('gender')).toThrow(`gender wasn't injected`);
    expect(container.resolve(sym)).toBe(undefined);
    expect(container.resolve(A)).toBeInstanceOf(A);
    expect(container.resolve(A)).toStrictEqual(container.resolve(A));
  });

  test('inject error', async () => {
    @Injectable()
    class A {
      msg: string;

      constructor(a) {}
    }

    @Injectable()
    class B {
      constructor(@Inject('c') c) {}
    }

    class C {}

    const container = new Container();
    expect(() => container.resolve(A)).toThrow('A > Object is not injectable.');
    expect(() => container.resolve(B)).toThrow(`B > c wasn't injected`);

    expect(() => container.resolve(C)).toThrow('C is not injectable.');
  });

  test('circular error', async () => {
    @Injectable()
    class Foo {
      constructor(@Inject('Bar') bar) {}
    }

    @Injectable()
    class Bar {
      constructor(@Inject('Foo') foo) {}
    }

    const container = new Container();
    container.register('Foo', Foo);
    container.register('Bar', Bar);

    expect(() => container.resolve(Bar)).toThrow(`Circular dependencies dection at Bar > Foo > Bar > Foo`);
  });

  test('execute', async () => {
    const Flow = Container.createDecorator();

    @Injectable()
    class B {
      msg: string = 'b';

      @Flow()
      parent() {
        this.msg += 'parent';
      }
    }

    @Injectable()
    class A {
      msg: string = '';

      @Flow()
      begin(b: B) {
        this.msg += b.msg + 'begin';
      }

      @Flow()
      end() {
        this.msg += 'end';
      }
    }

    const container = new Container();

    container.register(A);

    await container.execute(Flow);

    expect(container.resolve<A>(A).msg).toBe('bparentbeginend');
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

      log(cn: Container) {
        console.log(cn.summary());
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
