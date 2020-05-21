import 'https://unpkg.com/svelte@3.22.3/compiler.js'
import { join } from 'https://deno.land/std@0.51.0/path/mod.ts'
import { emptyDir, readFileStr, writeFileStr, ensureFile } from 'https://deno.land/std@0.51.0/fs/mod.ts'
import { renderFileToString } from 'https://deno.land/x/dejs@0.7.0/mod.ts'

const compiler = (window as any)['svelte']
const cwd = Deno.cwd()
const build_dir = join(cwd, '__build__')
const source_dir = join(cwd, 'src')
const pages_dir = join(source_dir, 'pages')
const internal_dir = join(source_dir, 'internal')

async function compile_component(path) {
  const source = await readFileStr(path)

  const sourceWithLayout = `
    <script>
  `

  const ssr = compiler.compile(source, {
    dev: false,
    css: false,
    format: 'esm',
    filename: path,
    generate: 'ssr',
    sveltePath: 'https://unpkg.com/svelte@3.22.3',
  })

  // Replacing the src with __build__ for the output is hacky and unreliable --> change
  const build_path = path.replace('.svelte', '.js').replace('src', '__build__')
  await ensureFile(build_path)
  return writeFileStr(build_path, ssr.js.code)
}

async function compile_dir(dir) {
  for await (const dir_entry of Deno.readDir(dir)) {
    if (dir_entry.isDirectory) {
      await compile_dir(join(dir, dir_entry.name))
    } else if (dir_entry.isFile) {
      if (dir_entry.name.endsWith('.svelte')) {
        await compile_component(join(dir, dir_entry.name))
      }
    }
  }
}

async function main() {
  // remove current build
  await emptyDir(build_dir)

  await compile_dir(source_dir)
}

main()
