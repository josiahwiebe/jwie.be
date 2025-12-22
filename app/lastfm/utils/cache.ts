const CACHE_KEY = 'trackDurations'

interface Cache {
  data: { [key: string]: number }
  get(key: string): number | undefined
  set(key: string, value: number): void
  save(): void
  clear(): void
  load(): void
}

function getStorage(): { [key: string]: number } {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

export const cache: Cache = {
  data: {},

  get(key: string) {
    if (Object.keys(this.data).length === 0) this.load()
    return this.data[key]
  },

  set(key: string, value: number) {
    this.data[key] = value
    this.save()
  },

  save() {
    if (typeof window === 'undefined') return
    localStorage.setItem(CACHE_KEY, JSON.stringify(this.data))
  },

  load() {
    this.data = getStorage()
  },

  clear() {
    this.data = {}
    this.save()
  },
}

export function clearCache() {
  cache.clear()
}

export function getCacheCount(): number {
  if (Object.keys(cache.data).length === 0) cache.load()
  return Object.keys(cache.data).length
}
