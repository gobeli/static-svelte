import compiler from 'https://dev.jspm.io/svelte/compiler'
import { join, normalize, basename } from 'https://deno.land/std@0.53.0/path/mod.ts'
import { emptyDir, readFileStr, writeFileStr, ensureFile, exists } from 'https://deno.land/std@0.53.0/fs/mod.ts'

import build_config from './build.config.ts'

const build_dir = './__build__'
const public_dir = join(build_dir, 'public')

export interface Component {
  path: string
  buildPath: string
  clientPath: string
}

export interface Page {
  route: string
  file: string
}

export interface BuildConfig {
  pages: Array<Page>
  template: string
}

async function read_template(path: string) {
  if (!(await exists(path))) {
    throw new Error(`Template not found at ${path}`)
  }
  return readFileStr(path)
}

async function compile_component(path: string): Promise<Component> {
  const source = await readFileStr(path)

  const ssr = compiler.compile(source, {
    dev: false,
    css: false,
    format: 'esm',
    filename: path,
    generate: 'ssr',
    sveltePath: 'https://dev.jspm.io/svelte',
  })

  const client = compiler.compile(source, {
    dev: false,
    css: false,
    filename: path,
    hydratable: true,
    format: 'esm',
    sveltePath: 'https://dev.jspm.io/svelte',
  })

  // Replacing the src with __build__ for the output is hacky and unreliable --> change
  const build_path = path.replace('.svelte', '.js').replace('src', '__build__')
  const client_path = path.replace('.svelte', '.js').replace('src', '__build__/client')
  await ensureFile(build_path)
  const code = ssr.js.code.replace(/import (.*).svelte";/g, 'import $1.js";')
  await writeFileStr(build_path, code)
  const client_code = client.js.code.replace(/import (.*).svelte";/g, 'import $1.js";')
  await ensureFile(client_path)
  await writeFileStr(client_path, client_code)

  return { path, buildPath: build_path, clientPath: client_path }
}

async function compile_dir(dir, components: Component[]) {
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

async function build_pages(components: Component[], template: string) {
  build_config.pages.forEach(async (page) => {
    const component: Component = components.find((c) => normalize(c.path) === normalize(page.file))
    if (!component) {
      throw new Error(`Component at ${page.file} not found!`)
    }
    const built_component = await import('./' + component.buildPath)
    const public_path = join(public_dir, ...page.route.split('/'), 'index.html')
    await ensureFile(public_path)
    const page_html = template.replace('%svelte.html%', built_component.default.render().html)
    await writeFileStr(public_path, page_html)
    
  })
}

async function main() {
  // remove current build
  await emptyDir(build_dir)

  const template = await read_template(build_config.template)

  const components = []
  await compile_dir('./src', components)

  await build_pages(components, template)
}

main()
