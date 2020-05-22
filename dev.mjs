import { join, basename } from 'path'
import { promises, write } from 'fs'
import { get_pages } from './lib/util.mjs'

const { writeFile } = promises
const cwd = process.cwd()
const build_dir = join(cwd, '__build__')
const source_dir = join(cwd, 'src')
const pages_dir = join(source_dir, 'pages')
const internal_dir = join(source_dir, 'internal')

async function main() {
  const pages = await get_pages(pages_dir)
  const dev = `
<script>
  import router from 'page'

  ${pages
    .map((page) => `import ${page.path.replace('/', '_').replace('.svelte', '')} from '../pages${page.path}'`)
    .join('\n\t')}

  import Layout from '../pages/_layout.svelte'

  let page

  ${pages
    .map((page) => `router('${page.route}', () => (page = ${page.path.replace('/', '_').replace('.svelte', '')}))`)
    .join('\n\t')}

  router.start()
</script>

<Layout>
  <svelte:component this={page} />
</Layout>
  `

  await writeFile(join(internal_dir, 'dev.svelte'), dev)
}

main()
