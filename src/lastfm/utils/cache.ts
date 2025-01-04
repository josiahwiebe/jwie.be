const CACHE_KEY = 'trackDurations'

interface Cache {
  data: { [key: string]: number }
  get(key: string): number | undefined
  set(key: string, value: number): void
  save(): void
  clear(): void
}

export const cache: Cache = {
  data: JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'),

  get(key: string) {
    return this.data[key]
  },

  set(key: string, value: number) {
    this.data[key] = value
    this.save()
  },

  save() {
    localStorage.setItem(CACHE_KEY, JSON.stringify(this.data))
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
  return Object.keys(cache.data).length
}
