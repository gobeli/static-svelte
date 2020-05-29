import { BuildConfig } from './build.deno.ts'
export default <BuildConfig>{
  pages: [
    { file: './src/pages/index.svelte', route: '/' },
    { file: './src/pages/about.svelte', route: '/about' },
  ],
  // no file extension, so parcel doesn't mistake it as an entrypoint 
  template: './src/template',
}
