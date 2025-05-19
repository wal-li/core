import { Controller, HttpDecorators, Input, Middleware } from './decorators';
import { Container, Injectable } from './di';
import { Method } from './enums';
import { Server } from './server';
import { joinPath, merge } from './utils';

@Injectable()
class BaseController {
  constructor(protected server: Server) {
    const base = Container.getMetadata(Controller.key, this.constructor as any)[`undefined`][0] ?? '/';

    HttpDecorators.forEach((decoMethod) => {
      const ls = Container.listDecoratorMethods(decoMethod.key, this.constructor as any);

      for (const name of ls) {
        const handler = (this as any)[name];

        const paths = (Container.getMetadata(decoMethod.key, this.constructor as any, name)['undefined'] || []).map(
          (p: string) => joinPath(base, p),
        );
        const middlewares = Container.getMetadata(Middleware.key, this.constructor as any, name)?.middlewares || [];
        const middlewaresFns = middlewares.map(([fn, args]: any) => {
          if (typeof fn === 'string') fn = (this as any)[fn];

          if (!fn) throw new Error(`Cannot find middleware ${fn}`);

          return fn.bind(this)(...args);
        });
        const baseInput = Container.getMetadata(Input.key, this.constructor as any, name)?.['undefined']?.[0];

        server.addRoute(
          decoMethod.name as Method,
          ...paths,
          ...middlewaresFns,
          handler.bind(this),
          merge(
            {
              controller: {
                name: this.constructor.name,
                method: name,
              },
              route: {
                paths,
                middlewares: middlewares.map(([fn]: any) => fn),
              },
            },
            baseInput ? baseInput : {},
          ),
        );
      }
    });
  }
}

export { BaseController };
