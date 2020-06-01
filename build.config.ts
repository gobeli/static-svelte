import { join } from 'https://deno.land/std@0.53.0/path/mod.ts'

import { BuildConfig } from './lib/interfaces.ts'

const cwd = Deno.cwd()
const pages = join(cwd, 'src', 'pages')

export default <BuildConfig>{
  pages: [
    { file: join(pages, 'index.svelte'), route: '/' },
    { file: join(pages, 'about.svelte'), route: '/about' },
  ],
  // no file extension, so parcel doesn't mistake it as an entrypoint
  template: join(cwd, 'src', 'template'),
  publicDir: join(cwd, 'public'),
  buildDir: join(cwd, '__build__'),
  srcDir: join(cwd, 'src'),
}
