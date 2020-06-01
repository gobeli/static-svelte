import compiler from 'https://dev.jspm.io/svelte/compiler'
import { join, normalize, basename, relative, dirname, format } from 'https://deno.land/std@0.53.0/path/mod.ts'
import { emptyDir, readFileStr, writeFileStr, ensureFile, exists } from 'https://deno.land/std@0.53.0/fs/mod.ts'

import { Component } from './interfaces.ts'
import BuildConfig from '../build.config.ts'

export async function compile_component(path: string): Promise<Component> {
  const source = await readFileStr(path)

  const ssr = compiler.compile(source, {
    dev: false,
    format: 'esm',
    filename: path,
    generate: 'ssr',
    css: false,
    sveltePath: 'https://dev.jspm.io/svelte',
  })

  const build_path = format({
    dir: join(BuildConfig.buildDir, relative(BuildConfig.srcDir, dirname(path))),
    name: basename(path, 'svelte'),
    ext: 'js',
  })
  await ensureFile(build_path)
  const code = ssr.js.code.replace(/import (.*)\.svelte(.*)/g, 'import $1.js$2')
  await writeFileStr(build_path, code)

  return { path, buildPath: build_path }
}

export async function compile_dir(dir, components: Component[]) {
  for await (const dir_entry of Deno.readDir(dir)) {
    if (dir_entry.isDirectory) {
      await compile_dir(join(dir, dir_entry.name), components)
    } else if (dir_entry.isFile) {
      if (dir_entry.name.endsWith('.svelte')) {
        const component = await compile_component(join(dir, dir_entry.name))
        components.push(component)
      }
    }
  }
}
