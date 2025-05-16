import request from 'supertest';
import formidable from 'formidable';
import { Server as IoServer } from 'socket.io';
import { io } from 'socket.io-client';
import {
  simpleParseForm,
  Response,
  Server,
  ServerPlugin,
  ApiErrorResponse,
  ApiSuccessResponse,
  httpLogger,
} from '../src/server';
import { Method } from '../src/enums';
import { Container } from '../src/di';
import { readFileSync } from 'node:fs';

function checkList(noTasks) {
  let resolve;
  return {
    wait() {
      return new Promise((r) => (resolve = r));
    },
    release() {
      resolve();
    },
    done() {
      noTasks--;
      if (noTasks <= 0) this.release();
    },
  };
}

describe('Server test', () => {
  it('should response', async () => {
    expect(new Response()).toHaveProperty('status', 404);
    expect(new Response()).toHaveProperty('body', 'Not Found');
    expect(new Response(301, undefined, { Location: 'https://www.haova.me' }).headers).toHaveProperty('location', [
      'https://www.haova.me',
    ]);
  });

  it('should be a normal server', async () => {
    const server = new Server();

    server.addRoute(Method.GET, '/', () => {
      return 'hello, world';
    });

    await server.start();

    const res = await request(server.address).get('/');
    expect(res).toHaveProperty('text', 'hello, world');
    expect(res).toHaveProperty('status', 200);

    await server.stop();
  });

  it('should catch error when server starting error', async () => {
    const server = new Server('0.0.0.0', 8080);

    await server.start();

    await expect(new Server('0.0.0.0', 8080).start()).rejects.toThrow(
      'listen EADDRINUSE: address already in use 0.0.0.0:8080',
    );

    await server.stop();
  });

  it('should use plugin', async () => {
    const server = new Server('0.0.0.0', 8080);

    server.use(new ServerPlugin());

    await server.start();
    await server.stop();
  });

  it('should be a rest server', async () => {
    const server = new Server('0.0.0.0', 8080);

    server.use(httpLogger);
    server.use(simpleParseForm);

    server.addRoute(Method.GET, '/', () => {
      return {
        msg: 'hello, world',
      };
    });

    server.addRoute(Method.POST, '/form', ({ fields }) => {
      return {
        msg: `hello, ${fields.name}`,
      };
    });

    await server.start();

    const res = await request(server.address).get('/');
    expect(res).toHaveProperty('body', { msg: 'hello, world' });
    expect(res).toHaveProperty('status', 200);
    expect(res.headers).toHaveProperty('content-type', 'application/json');

    const res2 = await request(server.address)
      .post('/form')
      .set('content-type', 'application/json; charset=utf-8')
      .send({ name: 'foo' });
    expect(res2).toHaveProperty('body', { msg: 'hello, foo' });

    const res3 = await request(server.address).post('/form').send('name=foo');
    expect(res3).toHaveProperty('body', { msg: 'hello, foo' });

    const res4 = await request(server.address).post('/form').field('name', 'foo');
    expect(res4).toHaveProperty('body', { msg: 'hello, undefined' });

    const res5 = await request(server.address).post('/form').send('abcdef');
    expect(res5).toHaveProperty('body', { msg: 'hello, undefined' });

    await server.stop();
  });

  it('should handle wrong json post', async () => {
    const server = new Server('0.0.0.0', 8080);

    server.use(
      new ServerPlugin({
        error(ins) {
          if (ins.error instanceof Response) {
            ins.output = ins.error;
          } else if (ins.error instanceof Error) {
            ins.output = new ApiErrorResponse('INTERNAL_SERVER_ERROR', ins.error.message);
          }
        },
      }),
    );
    server.use(simpleParseForm);

    server.addRoute(Method.POST, '/form', ({ fields }) => {
      return {
        msg: `hello, ${fields.name}`,
      };
    });

    await server.start();

    const res = await request(server.address)
      .post('/form')
      .set('content-type', 'application/json; charset=utf-8')
      .send(`{"foo:bar}`);
    expect(res.body).toHaveProperty('error');

    await server.stop();
  });

  it('should be a formidable server', async () => {
    const server = new Server('0.0.0.0', 8080);

    server.use(
      new ServerPlugin({
        before: async ({ req, input }) => {
          const [fields, files] = await formidable({}).parse(req);

          input.fields = fields;
          input.files = files;
        },
      }),
    );

    server.addRoute(Method.POST, '/form', ({ fields, files }) => {
      return {
        msg: `hello, ${fields.name}`,
        ref: files.doc[0].originalFilename,
      };
    });

    await server.start();

    const res = await request(server.address).post('/form').field('name', 'foo').attach('doc', './package.json');
    expect(res).toHaveProperty('body', { msg: 'hello, foo', ref: 'package.json' });

    await server.stop();
  });

  it('should request header', async () => {
    const server = new Server('0.0.0.0', 8080);

    server.addRoute(Method.GET, '/', ({ headers }) => {
      return {
        name: headers.name,
      };
    });

    await server.start();

    const res = await request(server.address).get('/').set('name', 'foo');
    expect(res).toHaveProperty('body', { name: 'foo' });

    await server.stop();
  });

  it('should return number', async () => {
    const server = new Server('0.0.0.0', 8080);

    server.addRoute(Method.GET, '/', ({}) => {
      return 123;
    });

    await server.start();

    const res = await request(server.address).get('/');
    expect(res).toHaveProperty('text', '123');

    await server.stop();
  });

  it('should catch-all', async () => {
    const server = new Server('0.0.0.0', 8080);

    server.addRoute(Method.GET, '/foo/[[...bar]]', ({ params }) => {
      return {
        bar: params.bar,
      };
    });

    await server.start();

    const res = await request(server.address).get('/foo');
    expect(res).toHaveProperty('body', { bar: undefined });

    const res2 = await request(server.address).get('/foo/a/b/c');
    expect(res2).toHaveProperty('body', { bar: 'a/b/c' });

    await server.stop();
  });

  it('should integrate with socket io', async () => {
    const server = new Server('0.0.0.0', 8080);
    const ioServer = new IoServer();
    const task = checkList(2);
    ioServer.attach(server.legacyServer);

    await server.start();

    const clientSocket = io(server.address);
    ioServer.on('connection', (socket) => {
      task.done();

      clientSocket.disconnect();

      socket.on('disconnect', () => {
        task.done();
      });
    });

    await task.wait();
    await server.stop();
  });

  it('should throw server exception', async () => {
    const server = new Server('0.0.0.0', 8080);

    // simple error handle
    server.addRoute(Method.GET, '/throw-error', ({}) => {
      return new Response(undefined, new Error(`Error message`));
    });

    await server.start();

    // simple error
    let res = await request(server.address).get('/throw-error');
    expect(res.text).toEqual('Error message');
    expect(res).toHaveProperty('status', 500);

    await server.stop();
  });

  it('should throw server exception via plugin', async () => {
    const server = new Server('0.0.0.0', 8080);

    server.use(
      new ServerPlugin({
        error(ins) {
          if (ins.error instanceof Response) {
            ins.output = ins.error;
          } else if (ins.error instanceof Error) {
            ins.output = new ApiErrorResponse('INTERNAL_SERVER_ERROR', ins.error.message);
          }
        },
      }),
    );

    // simple error handle
    server.addRoute(Method.GET, '/throw-error', ({}) => {
      throw new Error(`Error message`);
    });

    // success error handle
    server.addRoute(Method.GET, '/throw-success', ({}) => {
      throw new ApiSuccessResponse('ok');
    });

    await server.start();

    // simple error
    let res = await request(server.address).get('/throw-error');
    expect(res.body).toHaveProperty('error', 'Error message');
    expect(res).toHaveProperty('status', 500);

    res = await request(server.address).get('/throw-success');
    expect(res.body).toHaveProperty('data', 'ok');
    expect(res).toHaveProperty('status', 200);

    await server.stop();
  });

  it('should not response when already write', async () => {
    const server = new Server('0.0.0.0', 8080);

    server.use(
      new ServerPlugin({
        after(input) {
          input.output = undefined;
        },
      }),
    );

    server.addRoute(Method.GET, '/foo', ({ res }) => {
      return 'this';
    });

    await server.start();

    const res = await request(server.address).get('/foo');
    expect(res).toHaveProperty('text', 'this');

    await server.stop();
  });

  it('should di server', async () => {
    process.env['TEST_HOST'] = '0.0.0.0';
    process.env['TEST_PORT'] = '8080';

    const container = new Container('test');

    const server: Server = container.resolve(Server);
    expect(server.address).toEqual('http://0.0.0.0:8080');
  });

  it('should create a https server', async () => {
    const key = readFileSync('./tests/fixtures/key.pem').toString();
    const cert = readFileSync('./tests/fixtures/cert.pem').toString();

    const server = new Server('localhost', 8000, 'https', key, cert);

    server.addRoute(Method.GET, '/', () => {
      return 'hello, world';
    });

    await server.start();
    await server.stop();
  });

  it('should send content type request', async () => {
    const server = new Server('0.0.0.0', 8080);

    server.use(simpleParseForm);

    server.addRoute(Method.GET, '/foo', ({ res }) => {
      return 'this';
    });

    await server.start();

    const res = await request(server.address).get('/foo').set('Content-Type', 'application/json');
    expect(res).toHaveProperty('text', 'this');

    await server.stop();
  });
});
