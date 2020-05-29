# svelte-snowpack
Starter to build hydratable svelte apps with snowpack

## Prerequisites
`node` and `deno` have to be installed.

## How it works
Pages defined in `build.config.ts` are prerendered to the `public` folder, using snowpack those pages are hydrated with the svelte components at runtime.

## Roadmap
* Code-splitting to prevent bundles from loading the same code on each page but from different source (i.e. Layout code)
* client side routing