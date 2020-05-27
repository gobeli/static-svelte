import { BuildConfig } from './build.deno.ts'
export default <BuildConfig>{
  pages: [
    { file: './src/pages/index.svelte', route: '/' },
    { file: './src/pages/about.svelte', route: '/about' },
  ],
  template: './src/template.html',
}
