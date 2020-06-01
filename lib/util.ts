export function toFileUrl(path: string) {
  const url = new URL(`file:///${path}`)
  return url.toString()
}
