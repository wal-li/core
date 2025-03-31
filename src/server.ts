import { createServer, Server as LegacyServer, IncomingMessage, ServerResponse } from 'node:http';
import { Inject, Injectable } from './di.js';
import { Method, MimeType, StatusCode } from './enums.js';
import { ReasonPhrases } from './constants.js';
import { Start, Stop } from './decorators.js';
import { isPlainObject, parseQuery, pathToRegexp } from './utils.js';
import { Logger } from './logger.js';
import { colors } from './colors.js';

const HOST_ENV = 'env.host';
const PORT_ENV = 'env.port';

type Route = {
  method: Method;
  paths: RegExp[];
  fns: Function[];
};

type Request = {
  url: URL;
  method: Method;
  path: string;
  query: object;
  params: object;
  fields: any;
  files: any;
  headers: any;
};

class HeaderMap {
  [key: string]: any;

  constructor() {
    return new Proxy(this, {
      get(target, prop: string, receiver) {
        if (typeof prop === 'string') prop = prop.toLowerCase();
        return Reflect.get(target, prop, receiver);
      },

      set(target, prop: string, value, receiver) {
        if (typeof prop === 'string') prop = prop.toLowerCase();
        if (!Array.isArray(value)) value = [value];
        return Reflect.set(target, prop, value, receiver);
      },
    });
  }
}

class Response {
  public headers: HeaderMap = new HeaderMap();

  constructor(public status?: StatusCode, public body?: any, headers?: any) {
    if (this.status === undefined) this.status = this.body === undefined ? StatusCode.NOT_FOUND : StatusCode.OK;

    if (this.status !== undefined && this.body === undefined) this.body = ReasonPhrases[this.status];

    if (this.body instanceof Error) {
      this.status ??= StatusCode.INTERNAL_SERVER_ERROR;
      this.body = body.message;
    }

    if (isPlainObject(body) || Array.isArray(body)) {
      this.body = JSON.stringify(body);
      this.headers['content-type'] = MimeType.JSON;
    }

    if (isPlainObject(headers)) for (const name in headers) this.headers[name] = headers[name];
  }
}

class ApiSuccessResponse extends Response {
  constructor(data: any, meta: { [key: string]: any } = {}, headers?: any) {
    super(
      StatusCode.OK,
      {
        data,
        meta,
      },
      headers,
    );
  }
}

class ApiErrorResponse extends Response {
  constructor(code: keyof typeof StatusCode, message: string, headers?: any) {
    super(
      StatusCode[code],
      {
        error: message,
        meta: {
          status: StatusCode[code],
          code,
          title: ReasonPhrases[StatusCode[code]],
          detail: message,
        },
      },
      headers,
    );
  }
}

enum ServerPluginHook {
  before = 'before',
  route = 'route',
  after = 'after',
  error = 'error',
}

type ServerPluginData = {
  req: IncomingMessage;
  res: ServerResponse;
  input?: Request;
  routes?: [Route, any][];
  output?: Response;
  error?: any;
};

class ServerPlugin {
  public before?: Function;
  public route?: Function;
  public after?: Function;
  public error?: Function;

  constructor(raw?: any) {
    if (raw?.before) this.before = raw.before;
    if (raw?.route) this.route = raw.route;
    if (raw?.after) this.after = raw.after;
    if (raw?.error) this.error = raw.error;
  }
}

const simpleParseForm = new ServerPlugin({
  async before({ req, input }: any) {
    const body = await new Promise((resolve, reject) => {
      const contentType = (req.headers['content-type'] || '').split(';')[0]?.trim().toLowerCase();

      const chunks: any[] = [];
      req.on('data', (chunk: any) => {
        chunks.push(chunk);
      });
      req.on('error', (err: any) => reject(err));
      req.on('end', () => {
        if (contentType === MimeType.JSON) {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch (err) {
            reject(err);
          }
        } else if (contentType === MimeType.URLENCODED) {
          resolve(parseQuery(Buffer.concat(chunks).toString()));
        } else {
          resolve(Buffer.concat(chunks).toString());
        }
      });
    });
    if (isPlainObject(body)) input.fields = body;
  },
});

const httpLogger = new ServerPlugin({
  async before({ res, input }: any) {
    const startTime = +new Date();
    input.logs = [colors.blue(input.method.toUpperCase())];
    res.on('close', () => {
      input.logs.push(
        colors.magenta(res.statusCode),
        input.path + input.url.search,
        colors.yellow(+new Date() - startTime, 'ms'),
      );
      (this as any).logger.http(input.logs.join(' '));
    });
  },
});

@Injectable()
class Server {
  private isRunning: boolean = false;
  private routes: Route[] = [];
  private plugins: ServerPlugin[] = [];

  public host: string;
  public port: number;

  public logger: Logger = new Logger('server');
  public legacyServer: LegacyServer;

  /**
   * Initializes the server with an optional host and port.
   * These values are injected using dependency injection,
   * allowing them to be set from environment variables.
   *
   * @param host - The server host (optional).
   * @param port - The server port (optional).
   */
  constructor(
    @Inject(HOST_ENV, { undefined: true }) host?: string,
    @Inject(PORT_ENV, { undefined: true }) port?: number,
  ) {
    this.host = host ?? '127.0.0.1';
    this.port = port ?? 0;

    this.legacyServer = createServer(this.serverCallback.bind(this));
  }

  /**
   * Executes a specified server plugin hook with the given data.
   * This allows for extending server functionality dynamically.
   *
   * @param hook - The plugin hook to execute.
   * @param data - The data to pass to the plugin.
   */
  private async runPlugin(hook: ServerPluginHook, data: ServerPluginData) {
    for (const plugin of this.plugins) {
      if (!plugin[hook]) continue;
      await plugin[hook].bind(this)(data);
      if (data.res.writableEnded) break;
    }
    return data;
  }

  /**
   * Converts an incoming HTTP request into a standardized Request object.
   * This ensures a consistent format for processing requests.
   *
   * @param req - The incoming HTTP request.
   * @returns A transformed Request object.
   */
  private prepareInput(req: IncomingMessage): Request {
    const url = new URL(req.url || '/', this.address);
    return {
      url,
      method: (req.method || Method.GET).toLowerCase() as Method,
      path: url.pathname,
      query: parseQuery(url.searchParams),
      params: {},
      fields: {},
      files: {},
      headers: req.headers,
    };
  }

  /**
   * Writes the processed response back to the client.
   * Handles serialization and sends the final output.
   *
   * @param res - The server response object.
   * @param output - The optional response to send.
   */
  private writeOutput(res: ServerResponse, output?: Response) {
    if (output === undefined) output = new Response();

    if (!(output instanceof Response)) {
      output = new Response(StatusCode.OK, output);
    }

    // response
    for (const headerName in output.headers)
      for (const value of output.headers[headerName]) res.setHeader(headerName, value);

    res.writeHead(output.status || 404);
    res.end(output.body);
  }

  /**
   * Matches the incoming request against registered routes.
   * Extracts route parameters and returns matching route-handler pairs.
   *
   * @param input - The request object.
   * @returns An array of matching routes and associated parameters.
   */
  private matchRoutes(input: Request): [Route, any][] {
    const matchedRoutes: [Route, any][] = [];

    if (input.method.toUpperCase() in Method) {
      for (const route of this.routes) {
        if (route.method !== Method.ALL && route.method !== input.method) continue;

        let params: any;
        for (const path of route.paths) {
          const res = path.exec(input.path);
          if (!res) continue;

          params = {};

          for (let i = 1; i < res.length; i++) params[i] = res[i];
          for (const key in res.groups) params[key] = res.groups[key];

          break;
        }

        if (!params) continue;
        matchedRoutes.push([route, params]);
      }
    }

    return matchedRoutes;
  }

  /**
   * Handles incoming HTTP requests.
   * Processes requests, matches routes, executes handlers, and sends responses.
   *
   * @param req - The incoming HTTP request.
   * @param res - The server response object.
   */
  private async serverCallback(req: IncomingMessage, res: ServerResponse) {
    // wrap callback with exception handle
    let input: Request | undefined;
    let pluginData;
    let output: Response | undefined;
    let routes;

    try {
      // prepare input
      input = this.prepareInput(req);

      // before hook
      pluginData = await this.runPlugin(ServerPluginHook.before, {
        req,
        res,
        input,
      });

      // direct response
      if (res.writableEnded) return;
      if (pluginData.output) return this.writeOutput(res, pluginData.output);

      // route matching
      routes = this.matchRoutes(input);

      // after route matching
      pluginData = await this.runPlugin(ServerPluginHook.route, {
        req,
        res,
        input,
        routes,
      });

      // direct response
      if (res.writableEnded) return;
      if (pluginData.output) return this.writeOutput(res, pluginData.output);

      // routing
      for (const [route, params] of routes) {
        input.params = params;
        for (const fn of route.fns) {
          output = await fn(input);
          if (output !== undefined) break;
        }
        if (output !== undefined) break;
      }

      // direct response
      if (res.writableEnded) return;

      // after routing
      pluginData = await this.runPlugin(ServerPluginHook.after, {
        req,
        res,
        input,
        routes,
        output,
      });

      // direct response
      if (res.writableEnded) return;
      if (pluginData.output) return this.writeOutput(res, pluginData.output);

      // write output
      if (!res.writableEnded) return this.writeOutput(res, output);
    } catch (err: any) {
      // error hook
      try {
        const pluginData = await this.runPlugin(ServerPluginHook.error, {
          req,
          res,
          input,
          routes,
          output,
          error: err,
        });

        // direct response
        if (res.writableEnded) return;
        if (pluginData.output) return this.writeOutput(res, pluginData.output);
      } catch (plgError) {
        console.error(plgError);
      }

      this.legacyServer.emit('error', err.toString());

      if (res.writableEnded) return;

      if (err instanceof Response) return this.writeOutput(res, err);

      console.error(err);

      res.writeHead(StatusCode.INTERNAL_SERVER_ERROR);
      res.end(ReasonPhrases[StatusCode.INTERNAL_SERVER_ERROR]);
    }
  }

  get address() {
    return `http://${this.host}:${this.port}`;
  }

  /**
   * Registers a new route with the given HTTP method and handlers.
   * Supports route paths as strings and handlers as functions.
   *
   * @param method - The HTTP method (GET, POST, etc.).
   * @param args - Route path(s) and handler function(s).
   */
  addRoute(method: Method, ...args: (string | Function)[]) {
    const paths: RegExp[] = [];
    const docPaths: string[] = [];
    const fns: Function[] = [];
    for (const item of args) {
      if (typeof item === 'string') {
        paths.push(pathToRegexp(item));
        docPaths.push(item);
      } else fns.push(item);
    }
    this.routes.push({ method, paths, fns });
  }

  /**
   * Registers a server plugin.
   * Plugins can modify server behavior or add new features.
   *
   * @param plugin - The plugin to be used by the server.
   */
  use(plugin: ServerPlugin) {
    this.plugins.push(plugin);
  }

  /**
   * Starts the server, making it listen for incoming requests.
   * This method is decorated with @Start() to indicate server initialization.
   */
  @Start()
  start() {
    return new Promise<void>((resolve, reject) => {
      if (this.isRunning) return resolve();

      this.legacyServer.on('error', (err) => {
        if (!this.isRunning) reject(err);
      });

      this.legacyServer.listen(this.port, this.host, () => {
        this.port = (this.legacyServer.address() as any).port;
        this.isRunning = true;
        resolve();
      });
    });
  }

  /**
   * Stops the server gracefully.
   * This method is decorated with @Stop() to handle server shutdown logic.
   */
  @Stop()
  stop() {
    return new Promise<void>((resolve) => {
      if (!this.isRunning) return resolve();

      this.legacyServer.close(() => {
        this.isRunning = false;
        resolve();
      });
    });
  }
}

export { Server, ServerPlugin, Response, ApiSuccessResponse, ApiErrorResponse, simpleParseForm, httpLogger };
