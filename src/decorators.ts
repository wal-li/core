import { Container } from './di';
import { Method } from './enums';

// common decorators
const Start = Container.createDecorator();
const Stop = Container.createDecorator();

// http decorators
const Get = Container.createDecorator();
const Post = Container.createDecorator();
const Put = Container.createDecorator();
const Patch = Container.createDecorator();
const Delete = Container.createDecorator();
const All = Container.createDecorator();

Object.defineProperty(Get, 'name', { value: Method.GET });
Object.defineProperty(Post, 'name', { value: Method.POST });
Object.defineProperty(Put, 'name', { value: Method.PUT });
Object.defineProperty(Patch, 'name', { value: Method.PATCH });
Object.defineProperty(Delete, 'name', { value: Method.DELETE });
Object.defineProperty(All, 'name', { value: Method.ALL });

const HttpDecorators = [Get, Post, Put, Patch, Delete, All];

const middlewareSymbol = Symbol();

function Middleware(fn: any, ...args: any) {
  return (target: any, key: any) => {
    const meta = Reflect.getMetadata(middlewareSymbol, target, key) || {};

    meta.middlewares ??= [];
    meta.middlewares.unshift([fn, args]);

    Reflect.defineMetadata(middlewareSymbol, meta, target, key);
  };
}

Middleware.key = middlewareSymbol;

// mvc
const Controller = Container.createDecorator();
const Input = Container.createDecorator();

export { Start, Stop, Get, Post, Put, Patch, Delete, All, HttpDecorators, Middleware, Controller, Input };
