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

or

```bash
npm i -D wal-js
```

## Example

```ts

```

## FAQ

### Why not using `vitest`?

> Vite uses ESBuild which doesn't support "emitDecoratorMetadata" in tsconfig, since ESBuild doesn't have its own type system implemented. (https://stackoverflow.com/questions/68570519/why-cant-reflect-metadata-be-used-in-vite)

### Why CommonJS?

Typescript with ESM isn't satisfy requirement of the framework and related products: Jest, Isolated-VM. So, CommonJS.

## License

MIT.
