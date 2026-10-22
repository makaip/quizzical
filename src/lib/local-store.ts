"use client"

import { useSyncExternalStore } from "react"

/**
 * A JSON value kept in localStorage, shared by every component that reads it
 * and kept in sync across tabs. `parse` turns whatever is stored (or
 * `undefined` when nothing is) into a valid value.
 */
export function createLocalStore<T extends object>(
  key: string,
  parse: (value: unknown) => T
) {
  const listeners = new Set<() => void>()
  let cache: T | null = null

  function load(): T {
    try {
      const raw = window.localStorage.getItem(key)
      return parse(raw ? JSON.parse(raw) : undefined)
    } catch {
      return parse(undefined)
    }
  }

  function get(): T {
    if (cache === null) cache = load()
    return cache
  }

  function set(next: T) {
    cache = next
    try {
      window.localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // Keep the in-memory copy so the session still works.
      listeners.forEach((listener) => listener())
      throw new Error("Couldn't save to this browser's storage.")
    }
    listeners.forEach((listener) => listener())
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return
      cache = null
      listener()
    }
    window.addEventListener("storage", onStorage)
    return () => {
      listeners.delete(listener)
      window.removeEventListener("storage", onStorage)
    }
  }

  /** The stored value. `null` until the client has read storage. */
  function useValue(): T | null {
    return useSyncExternalStore<T | null>(subscribe, get, () => null)
  }

  return { get, set, useValue }
}

/** Parses a stored `{ [key]: value }` object, dropping entries that don't fit. */
export function parseRecord<V>(isValue: (value: unknown) => value is V) {
  return (value: unknown): Record<string, V> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {}
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, V] => isValue(entry[1]))
    )
  }
}
