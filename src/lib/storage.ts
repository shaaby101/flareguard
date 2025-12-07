type Listener = (changes: Record<string, unknown>) => void

type ChromeStorageLocal = {
  get: (keys: string[], callback: (result: Record<string, unknown>) => void) => void
  set: (items: Record<string, unknown>, callback: () => void) => void
  remove: (keys: string | string[], callback: () => void) => void
}

type ChromeLike = {
  storage?: {
    local?: ChromeStorageLocal
  }
  runtime?: {
    lastError?: unknown
  }
}

const chromeLike: ChromeLike | undefined =
  typeof globalThis !== 'undefined'
    ? (globalThis as typeof globalThis & { chrome?: ChromeLike }).chrome
    : undefined

const hasChromeStorage = !!chromeLike?.storage?.local

const listeners = new Set<Listener>()

function notify(key: string, value: unknown) {
  listeners.forEach(cb => cb({ [key]: value }))
}

export function onStorageChange(callback: Listener) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export async function storageGet<T>(key: string, fallback: T): Promise<T> {
  if (hasChromeStorage && chromeLike?.storage?.local) {
    return new Promise(resolve => {
      chromeLike.storage!.local!.get([key], result => {
        if (chromeLike.runtime?.lastError) {
          console.warn('chrome.storage get error', chromeLike.runtime.lastError)
          resolve(fallback)
        } else {
          const value = result[key]
          resolve(value === undefined ? fallback : value as T)
        }
      })
    })
  }

  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch (error) {
    console.warn('localStorage get error', error)
    return fallback
  }
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  if (hasChromeStorage && chromeLike?.storage?.local) {
    return new Promise(resolve => {
      chromeLike.storage!.local!.set({ [key]: value }, () => {
        if (chromeLike.runtime?.lastError) {
          console.warn('chrome.storage set error', chromeLike.runtime.lastError)
        } else {
          notify(key, value)
        }
        resolve()
      })
    })
  }

  try {
    localStorage.setItem(key, JSON.stringify(value))
    notify(key, value)
  } catch (error) {
    console.warn('localStorage set error', error)
  }
}

export async function storageRemove(key: string): Promise<void> {
  if (hasChromeStorage && chromeLike?.storage?.local) {
    return new Promise(resolve => {
      chromeLike.storage!.local!.remove(key, () => {
        if (chromeLike.runtime?.lastError) {
          console.warn('chrome.storage remove error', chromeLike.runtime.lastError)
        } else {
          notify(key, undefined)
        }
        resolve()
      })
    })
  }

  try {
    localStorage.removeItem(key)
    notify(key, undefined)
  } catch (error) {
    console.warn('localStorage remove error', error)
  }
}

export const extensionStorage = {
  isExtension: hasChromeStorage,
  get: storageGet,
  set: storageSet,
  remove: storageRemove,
  subscribe: onStorageChange
}
