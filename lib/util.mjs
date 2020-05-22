import { dirname, join, extname, basename } from 'path'
import { promises } from 'fs'
const { readdir, stat } = promises

async function walk(dir, path, pages) {
  const next = await readdir(dir)
  await Promise.all(
    next.map(async (item) => {
      const full_path = join(dir, item)
      const item_stat = await stat(full_path)
      if (item_stat.isDirectory()) {
        walk(full_path, `${path}/${dirname(full_path)}`, pages)
      } else if (item_stat.isFile() && extname(item) === '.svelte' && basename(item) !== '_layout.svelte') {
        pages.push({
          path: `${path}/${basename(item)}`,
          route: `${path}/${basename(item, '.svelte') === 'index' ? '' : basename(item, '.svelte')}`,
        })
      }
    })
  )
  return pages
}

export async function get_pages(dir) {
  return await walk(dir, '', [])
}
