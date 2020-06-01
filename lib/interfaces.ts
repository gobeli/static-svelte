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
  srcDir: string
  buildDir: string
  publicDir: string
}
