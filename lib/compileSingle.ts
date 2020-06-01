import { extname } from 'https://deno.land/std@0.53.0/path/mod.ts'
import { exists } from 'https://deno.land/std@0.53.0/fs/mod.ts'

import { compile_component } from './compile.ts'

async function main() {
  const path = Deno.args[0]

  if (!exists(path)) {
    throw new Error(`[compileSingle] File ${path} not found`)
  }

  if (extname(path) !== 'svelte') {
    console.log(`[compileSingle] Skip ${path}`)
  }

  await compile_component(path)
}

main()
