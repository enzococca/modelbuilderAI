/** Generate a unique ID for workflow nodes. */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Format file size for display. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

/** Truncate text to a max length. */
export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text
}
