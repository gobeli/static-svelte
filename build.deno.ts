import compiler from 'https://dev.jspm.io/svelte/compiler'
import { join, normalize, basename, relative, dirname, format } from 'https://deno.land/std@0.53.0/path/mod.ts'
import { emptyDir, readFileStr, writeFileStr, ensureFile, exists } from 'https://deno.land/std@0.53.0/fs/mod.ts'

import build_config from './build.config.ts'

const public_dir = './public'
const build_dir = './__build__'
const src_dir = './src'
const internal_dir = join(src_dir, 'internal')
const dist_path = '/dist'

export interface Component {
  path: string
  buildPath: string
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
    format: 'esm',
    filename: path,
    generate: 'ssr',
    css: false,
  })

  const build_path = format({
    dir: join(build_dir, relative(src_dir, dirname(path))),
    name: basename(path, 'svelte'),
    ext: 'js',
  })
  await ensureFile(build_path)
  const code = ssr.js.code.replace(/import (.*).svelte";/g, 'import $1.js";')
  await writeFileStr(build_path, code)

  return { path, buildPath: build_path }
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

async function create_entrypoint(page: Page) {
  const name = basename(page.file, '.svelte')
  const fromSrc = relative(src_dir, page.file)
  const path = join(internal_dir, dirname(fromSrc), name + '.js')

  const entrypoint = `
// This file is generated
import Page from '${join(dist_path, fromSrc).replace(/\\/g, '/')}'
import Dev from '../internal.svelte'

new Dev({
  target: document.getElementById('app'),
  hydrate: true,
  props: { page: Page }
})
`
  await ensureFile(path)
  await writeFileStr(path, entrypoint)
  return join(dist_path, relative(src_dir, path))
}

async function build_pages(components: Component[], template: string) {
  build_config.pages.forEach(async (page) => {
    const component = components.find((c) => normalize(c.path) === normalize(page.file))
    if (!component) {
      throw new Error(`Component at ${page.file} not found!`)
    }
    const internal_component = await import('./' + join(build_dir, 'internal', 'internal.js'))
    const page_component = await import('./' + component.buildPath)
    const public_path = join(public_dir, ...page.route.split('/'), 'index.html')

    const entry_file = (await create_entrypoint(page)).replace(/\\/g, '/')

    await ensureFile(public_path)
    const rendered_page = internal_component.default.render({ page: page_component.default })
    const page_html = template
      .replace('%svelte.notice%', 'This file is generated')
      .replace('%svelte.head%', rendered_page.head)
      .replace('%svelte.html%', rendered_page.html)
      .replace('%svelte.bundle%', entry_file)
    await writeFileStr(public_path, page_html)
  })
}

async function main() {
  // remove current build
  await emptyDir(build_dir)
  await emptyDir(public_dir)
  await emptyDir(join(internal_dir, 'pages'))

  const template = await read_template(build_config.template)

  const components = []
  await compile_dir('./src', components)

  await build_pages(components, template)
}

main()
