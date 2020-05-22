import { join, basename } from 'path'
import { promises } from 'fs'
import svelte from 'rollup-plugin-svelte'
import resolve from 'rollup-plugin-node-resolve'
import rollup from 'rollup'

const { access, mkdir, readdir, rmdir, readFile, writeFile } = promises

const cwd = process.cwd()
const build_dir = join(cwd, '__build__')
const source_dir = join(cwd, 'src')
const pages_dir = join(source_dir, 'pages')
const internal_dir = join(source_dir, 'internal')

function load_template() {
  const path = join(source_dir, 'template.html')
  if (!access(path)) {
    throw 'template.html not found'
  }
  return readFile(path)
}

async function create_server(pages, template, client_bundles) {
  const path_to_pages = '../src/pages'
  const routes = pages.map((page) => basename(page, '.svelte').toLowerCase())
  const imports = pages.map((page, i) => `import * as page_${i} from '${path_to_pages}/${page}'`)

  const start = `
    <script>
      const app = new App({
        target: document.body,
        hydrate: true
      });
    </script>
  `

  const server = `
    import polka from 'polka'
    import sirv from 'sirv'

    ${imports.join('\n')}

    const pages = {
      ${pages.map((p, i) => `page_${i}: page_${i}`).join(',\n')}
    }

    const bundles = {
      ${pages
        .map((p, i) => `page_${i}: '/bundle/${client_bundles.find((bundle) => bundle.page === p).file}'`)
        .join(',\n')}
    }
    console.log(bundles)

    const template = \`${template}\`

    function serve_route(index) {
      return (req, res) => {
        const html = template
          .replace('%svelte.html%', pages['page_' + index].default.render().html)
          .replace('%svelte.scripts%', \`<script src="\` + bundles['page_' + index] + \`"></script>${start}\`)
        res.end(html)
      }
    }

    polka()
      .use(sirv('__build__/dist'))
      ${routes
        .map((route) => (route === 'index' ? '' : route))
        .map((route, i) => `.get('/${route}', serve_route(${i}))`)
        .join('\n')}
      .listen(3000, err => {
        if (err) throw err;
        console.log('> Running on localhost:3000');
      })
  `

  await writeFile(join(build_dir, 'server.js'), server)

  const config = {
    inputOptions: {
      input: join(build_dir, 'server.js'),
      external: ['svelte', 'polka'],
      plugins: [
        svelte({
          dev: false,
          generate: 'ssr',
        }),
      ],
    },
    outputOptions: {
      sourcemap: true,
      format: 'cjs',
      file: join(build_dir, 'server.out.js'),
    },
  }

  const bundle_ssr = await rollup.rollup(config.inputOptions)
  await bundle_ssr.write(config.outputOptions)
}

async function compile_pages(pages) {
  return await Promise.all(
    pages
      .map((file) => ({
        inputOptions: {
          input: join(pages_dir, file),
          plugins: [
            svelte({
              dev: false,
              hydratable: true,
            }),
            resolve({
              browser: true,
              dedupe: (importee) => importee === 'svelte' || importee.startsWith('svelte/'),
            }),
          ],
        },
        outputOptions: {
          sourcemap: true,
          format: 'iife',
          name: 'App',
          entryFileNames: '[name].[hash].js',
          chunkFileNames: '[name].[hash].js',
          dir: join(build_dir, 'dist', 'bundle'),
        },
      }))
      .map(async (client) => {
        const bundle_client = await rollup.rollup(client.inputOptions)

        const bundle = await bundle_client.write(client.outputOptions)
        return { file: bundle.output[0].fileName, page: basename(client.inputOptions.input) }
      })
  )
}

async function main() {
  // remove current build
  await rmdir(build_dir, { recursive: true })
  await mkdir(build_dir)

  const template = await load_template()
  const pages = await readdir(pages_dir)

  const client_bundles = await compile_pages(pages, template)
  await create_server(pages, template, client_bundles)
}

main()
