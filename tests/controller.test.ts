import request from 'supertest';

import { Controller, Get, Input, Middleware, Start, Stop } from '../src/decorators';
import { Container, Injectable } from '../src/di';
import { BaseController } from '../src/controller';
import { Server } from '../src/server';
import { Method } from '../src/enums';

describe('Controller test', () => {
  it('shoult create a simple controller', async () => {
    @Controller()
    class SimpleController extends BaseController {
      @Get('/')
      hello({ controller }) {
        return `hello, world from ${controller.method}-${controller.name}`;
      }
    }

    // server
    const container = new Container();

    container.register(SimpleController);

    const server: Server = container.resolve<Server>(Server);

    await container.execute(Start);

    const res = await request(server.address).get('/');
    expect(res).toHaveProperty('text', 'hello, world from hello-SimpleController');
    expect(res).toHaveProperty('status', 200);

    await container.execute(Stop);
  });

  it('should create a based controller', async () => {
    // define
    @Controller('/parent')
    class NestedController extends BaseController {
      @Get('/child', '/other')
      @Middleware('chill')
      hello({ params }) {
        return `hello, ${params.name}`;
      }

      chill() {
        return (input) => {
          input.params.name = 'world';
        };
      }
    }

    // server
    const container = new Container();

    container.register(NestedController);

    const server: Server = container.resolve<Server>(Server);

    await container.execute(Start);

    const res = await request(server.address).get('/parent/child');
    expect(res).toHaveProperty('text', 'hello, world');
    expect(res).toHaveProperty('status', 200);

    const res2 = await request(server.address).get('/parent/other');
    expect(res2).toHaveProperty('text', 'hello, world');
    expect(res2).toHaveProperty('status', 200);

    await container.execute(Stop);
  });

  // it('should create a nested controller', async () => {});

  it('should create a controller with alternative server', async () => {
    // define
    @Injectable()
    class ApiServer extends Server {
      constructor() {
        super();

        this.addRoute(Method.GET, '/', () => {
          return 'hello, world';
        });
      }
    }

    @Controller()
    class SimpleController extends BaseController {
      constructor(server: ApiServer) {
        super(server);
      }
    }

    // server
    const container = new Container();

    container.register(SimpleController);

    const server: ApiServer = container.resolve<ApiServer>(ApiServer);

    await container.execute(Start);

    const res = await request(server.address).get('/');
    expect(res).toHaveProperty('text', 'hello, world');
    expect(res).toHaveProperty('status', 200);

    await container.execute(Stop);
  });

  it('should use base input', async () => {
    @Controller()
    class SimpleController extends BaseController {
      @Get('/', '/[name]')
      @Input({ params: { name: 'foo' } })
      hello({ params }) {
        return `hello, ${params.name}`;
      }
    }

    // server
    const container = new Container();

    container.register(SimpleController);

    const server: Server = container.resolve<Server>(Server);

    await container.execute(Start);

    expect(await request(server.address).get('/')).toHaveProperty('text', 'hello, foo');
    expect(await request(server.address).get('/bar')).toHaveProperty('text', 'hello, bar');

    await container.execute(Stop);
  });
});
