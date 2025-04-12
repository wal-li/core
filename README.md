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

### Security

**ID Generator**

As computational power increases, random IDs tend to become longer to enhance security. However, this does not guarantee protection. Random IDs can still be exposed through various risks, and once compromised, they are difficult to secure again. Therefore, random IDs are not always necessary, especially for internal systems.

Sequential IDs provide several advantages over random ones. Although they are predictable, we can protect them through additional mechanisms such as passwords, encrypted keys, or access tokens.

- Short and compact
- Naturally sortable

With proper design, sequential IDs can be used safely in distributed systems without collisions, using techniques like unique machine identifiers, timestamps, or sequence generators.

In `@wal-li/core`, we use a 64-bit sequential ID, defined as follows:

```
[ 1-bit  ][ 42-bit  ][  10-bit  ][ 10-bit ]
(sign bit)(timestamp)(machine id)(sequence)
```

| Field      | Space          |
| ---------- | -------------- |
| sign bit   | 1 (always `0`) |
| timestamp  | 139 years      |
| machine id | 1024 machines  |
| sequence   | 2048 ids       |

```js
import { uniqid } from '@wal-li/core';

uniqid();

uniqid.machine = 6;
uniqid.epoch = +new Date();

uniqid();
```

### Server

**Create**

TBD

**Routing**

- Static Routes: `/abc/def.html`.
- Dynamic Routes: `/abc/[tag]-[group]/[name].[ext]`.
- Group Routes: `/abc/(group)/def.html` - The `group` segment is ignored, `/abc/def.html` is matched.
- Catch-all Routes: `/abc/[...slug]` - Everything after the `/abc/` segment is captured in the `slug` variable.
- Optional Catch-all Routes: `/abc/[[...slug]]` - Everything after the `/abc/` segment is captured in the `slug` variable.
  - If the path is `/abc`, the `slug` will be `undefined`.
  - If the path is `/abc/`, the `slug` will be empty (`''`);

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

- This `Vm` is not a security mechanism. **Do not use it to run untrusted code**.
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
