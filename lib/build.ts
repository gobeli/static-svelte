import { join, normalize, basename, relative, dirname } from 'https://deno.land/std@0.53.0/path/mod.ts'
import { emptyDir, readFileStr, writeFileStr, ensureFile, exists } from 'https://deno.land/std@0.53.0/fs/mod.ts'

import { Component, Page } from './interfaces.ts'

import BuildConfig from '../build.config.ts'
import { compile_dir } from './compile.ts'
import { toFileUrl } from './util.ts'

const dist_path = '/dist'

async function read_template(path: string) {
  if (!(await exists(path))) {
    throw new Error(`Template not found at ${path}`)
  }
  return readFileStr(path)
}

async function create_entrypoint(page: Page) {
  const name = basename(page.file, '.svelte')
  const fromSrc = relative(BuildConfig.srcDir, page.file)
  const path = join(BuildConfig.srcDir, 'internal', dirname(fromSrc), name + '.js')

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
  return join(dist_path, relative(BuildConfig.srcDir, path)).replace(/\\/g, '/')
}

async function build_pages(components: Component[], template: string) {
  BuildConfig.pages.forEach(async (page) => {
    const component = components.find((c) => normalize(c.path) === normalize(page.file))
    if (!component) {
      throw new Error(`Component at ${page.file} not found!`)
    }
    const internal_component = await import(toFileUrl(join(BuildConfig.buildDir, 'internal', 'internal.js')))
    const page_component = await import(toFileUrl(component.buildPath))
    const public_path = join(BuildConfig.publicDir, ...page.route.split('/'), 'index.html')

    const entry_file = await create_entrypoint(page)

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
  // remove current out dirs
  await emptyDir(BuildConfig.buildDir)
  await emptyDir(BuildConfig.publicDir)
  await emptyDir(join(BuildConfig.srcDir, 'internal', 'pages'))

  const template = await read_template(BuildConfig.template)

  const components = []
  await compile_dir(BuildConfig.srcDir, components)

  await build_pages(components, template)
}

main()
