import request from 'supertest';
import formidable from 'formidable';
import { Server as IoServer } from 'socket.io';
import { io } from 'socket.io-client';
import { simpleParseForm, Response, Server, ServerPlugin, ApiErrorResponse, ApiSuccessResponse } from '../src/server';
import { Method } from '../src/enums';

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
  it('should Response', async () => {
    expect(new Response()).toHaveProperty('status', 404);
    expect(new Response()).toHaveProperty('body', 'Not Found');
    expect(new Response(301, undefined, { Location: 'https://www.haova.me' }).headers).toHaveProperty('location', [
      'https://www.haova.me',
    ]);
  });

  it('should be a Normal server', async () => {
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

  it('should use plugin', async () => {
    const server = new Server('0.0.0.0', 8080);

    server.use(new ServerPlugin());

    await server.start();
    await server.stop();
  });

  it('should be a rest server', async () => {
    const server = new Server('0.0.0.0', 8080);

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
});
