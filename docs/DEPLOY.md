# Deploy the demo

The demo contains static files.
It uses the same component source as the library.
The live lab on [esmirnov.ai](https://esmirnov.ai/nematic-game/) uses the component package.

## GitHub Pages

1. Open the repository settings on GitHub.
2. Open Pages.
3. Select GitHub Actions as the source.
4. Open Actions.
5. Select Deploy demo.
6. Run the workflow from `main`.

The workflow publishes the files from `demo-dist/`.
The demo uses relative asset paths.
You can also host these files on another static host.

## Other static hosts

Install the dependencies.

```sh
npm ci
```

Compile the demo.

```sh
npm run build:demo
```

Upload the contents of `demo-dist/` to the static host.
The server needs no runtime environment variables.
