import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type SetStateAction<T> = T | ((prev: T) => T)

type ChromeStorageLocal = {
  get: (keys: string[] | string, callback: (result: Record<string, unknown>) => void) => void
  set: (items: Record<string, unknown>, callback: () => void) => void
  remove: (keys: string[] | string, callback?: () => void) => void
}

type ChromeStorageOnChanged = {
  addListener: (callback: (changes: Record<string, { newValue?: unknown }>, areaName: string) => void) => void
  removeListener: (callback: (changes: Record<string, { newValue?: unknown }>, areaName: string) => void) => void
}

type ChromeStorage = {
  local?: ChromeStorageLocal
  onChanged?: ChromeStorageOnChanged
}

type ChromeLike = {
  storage?: ChromeStorage
  runtime?: {
    lastError?: unknown
  }
}

const chromeRef: ChromeLike | undefined =
  typeof globalThis !== 'undefined'
    ? (globalThis as typeof globalThis & { chrome?: ChromeLike }).chrome
    : undefined

const hasChromeStorage = !!chromeRef?.storage?.local

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeWithInitial<T>(stored: T, initialValue: T): T {
  if (stored === undefined || stored === null) return initialValue
  if (isPlainObject(stored) && isPlainObject(initialValue)) {
    return { ...(initialValue as Record<string, unknown>), ...(stored as Record<string, unknown>) } as T
  }
  return stored
}

async function readValue<T>(key: string, fallback: T): Promise<T> {
  if (hasChromeStorage && chromeRef?.storage?.local) {
    console.log(`[Storage] Loading "${key}" from Chrome storage`)
    return new Promise(resolve => {
      chromeRef.storage!.local!.get([key], result => {
        if (chromeRef.runtime?.lastError) {
          console.warn('[Storage] chrome.storage get error', chromeRef.runtime.lastError)
          resolve(fallback)
          return
        }
        const value = result[key]
        resolve(mergeWithInitial(value as T, fallback))
      })
    })
  }

  if (typeof window === 'undefined') return fallback

  console.log(`[Storage] Loading "${key}" from localStorage`)
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return mergeWithInitial(JSON.parse(raw) as T, fallback)
  } catch (error) {
    console.warn('[Storage] localStorage get error', error)
    return fallback
  }
}

function writeValue<T>(key: string, value: T) {
  if (hasChromeStorage && chromeRef?.storage?.local) {
    chromeRef.storage!.local!.set({ [key]: value }, () => {
      if (chromeRef.runtime?.lastError) {
        console.warn('[Storage] chrome.storage set error', chromeRef.runtime.lastError)
      }
    })
    return
  }

  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('[Storage] localStorage set error', error)
  }
}

function removeValue(key: string) {
  if (hasChromeStorage && chromeRef?.storage?.local?.remove) {
    chromeRef.storage.local.remove(key, () => {
      if (chromeRef.runtime?.lastError) {
        console.warn('[Storage] chrome.storage remove error', chromeRef.runtime.lastError)
      }
    })
    return
  }

  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(key)
  } catch (error) {
    console.warn('[Storage] localStorage remove error', error)
  }
}

export function useExtensionStorage<T>(key: string, initialValue: T): [T, (value: SetStateAction<T>) => void, boolean] {
  const initialRef = useRef(initialValue)
  const [value, setValue] = useState<T>(initialRef.current)
  const [isHydrated, setIsHydrated] = useState(false)
  const storageKey = useMemo(() => key, [key])

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      const stored = await readValue(storageKey, initialRef.current)
      if (!cancelled) {
        setValue(stored)
        setIsHydrated(true)
      }
    }

    hydrate()
    return () => {
      cancelled = true
    }
  }, [storageKey])

  const persist = useCallback(
    (next: T) => {
      writeValue(storageKey, next)
    },
    [storageKey]
  )

  const updateValue = useCallback(
    (updater: SetStateAction<T>) => {
      setValue(prev => {
        const resolved = typeof updater === 'function' ? (updater as (current: T) => T)(prev) : updater
        if (resolved === null) {
          removeValue(storageKey)
        } else {
          persist(resolved)
        }
        return resolved
      })
    },
    [persist, storageKey]
  )

  useEffect(() => {
    if (hasChromeStorage && chromeRef?.storage?.onChanged) {
      const handler = (changes: Record<string, { newValue?: unknown }>, areaName: string) => {
        if (areaName !== 'local') return
        if (!Object.prototype.hasOwnProperty.call(changes, storageKey)) return
        const next = changes[storageKey]?.newValue ?? initialRef.current
        setValue(next as T)
      }
      chromeRef.storage.onChanged.addListener(handler)
      return () => chromeRef.storage?.onChanged?.removeListener(handler)
    }

    if (typeof window !== 'undefined') {
      const handler = (event: StorageEvent) => {
        if (event.key !== storageKey) return
        if (event.newValue === null) {
          setValue(initialRef.current)
          return
        }
        try {
          setValue(JSON.parse(event.newValue) as T)
        } catch (error) {
          console.warn('[Storage] localStorage parse error', error)
        }
      }
      window.addEventListener('storage', handler)
      return () => window.removeEventListener('storage', handler)
    }
  }, [storageKey])

  return [value, updateValue, isHydrated]
}

export function clearExtensionStorageKey(key: string) {
  removeValue(key)
}
