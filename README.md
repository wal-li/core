# @wal-li/core

## Pre-requisites

Make sure your project has:

- Node.js 18+.
- `reflect-metadata` package.

If you're using typescript, make sure `tsconfig` is match with this:

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES2020",
    "esModuleInterop": true,
    "strict": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}
```

## Getting Started

```bash
npm i -D @wal-li/core
```

## Example

```ts
import { Container, Server, Start } from '@wal-li/core';

const container = new Container();

container.register(Server);

container.execute(Start);

const server = container.resolve<Server>(Server);
```

## Features

### Dependency Injection

TBD

### Server

TBD

### VM

`Vm` is a class that allows you to create a Node.js virtual environment with basic controls.

```ts
import { Vm } from '@wal-li/core';

await Vm.execute(
  `
  exports.handler = async function({ name }) {
    return "Hello, " + name + "!";
  }
`,
  { name: 'World' },
);

// Hello, World
```

Notes:

- This `Vm` is not a security mechanism. Do not use it to run untrusted code.
- It is a combination of node:worker_threads (for parallel execution) and vm (for sandboxing).
- Consider using `isolated-vm` or `docker` to run untrusted code.

Allowed in the global:

- `clearInterval`
- `clearTimeout`
- `setInterval`
- `setTimeout`
- `structuredClone`
- `atob`
- `btoa`
- `fetch`
- `crypto`

## FAQ

### Why not using `vitest`?

> Vite uses ESBuild which doesn't support "emitDecoratorMetadata" in tsconfig, since ESBuild doesn't have its own type system implemented. (https://stackoverflow.com/questions/68570519/why-cant-reflect-metadata-be-used-in-vite)

### Why CommonJS?

TypeScript with ESM doesn't satisfy the requirements of the framework and related products, such as Jest and Isolated-VM. So, CommonJS it is.

## License

MIT.
