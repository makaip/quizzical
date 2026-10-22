"use client"

import type { EmbedRequest, EmbedResponse } from "@/lib/embed.worker"
import type { Card } from "@/lib/sets"

// Sentence embeddings for card text, used to pick multiple-choice options that
// are close to the answer. Computed in a worker when a set is saved and kept in
// IndexedDB, keyed by the cleaned text, so unchanged cards are never redone.

const DB_NAME = "recall:embeddings:all-MiniLM-L6-v2"
const STORE = "vectors"
const BATCH_SIZE = 32

const memory = new Map<string, Float32Array>()

/** Plain text to embed: math and Markdown marks removed. */
export function embeddingText(text: string) {
  return text
    .replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g, " ")
    .replace(/[*_`#>~|[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Both sides together, which says more about a card's topic than a short term alone. */
function wholeCardText(card: Card) {
  return embeddingText(`${card.term}: ${card.definition}`)
}

/** The vector for some card text, if it's been loaded. */
export function embeddingFor(text: string): Float32Array | undefined {
  return memory.get(embeddingText(text))
}

/** The vector for a whole card, if it's been loaded. */
export function cardEmbeddingFor(card: Card): Float32Array | undefined {
  return memory.get(wholeCardText(card))
}

/** Cosine similarity of two normalized vectors. */
export function similarity(a: Float32Array, b: Float32Array) {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

function cardTexts(cards: Card[]) {
  const texts = new Set<string>()
  for (const card of cards) {
    for (const clean of [embeddingText(card.term), embeddingText(card.definition), wholeCardText(card)]) {
      if (clean) texts.add(clean)
    }
  }
  return [...texts]
}

let db: Promise<IDBDatabase> | null = null

function openDb() {
  db ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return db
}

async function readVectors(keys: string[]) {
  const store = (await openDb()).transaction(STORE).objectStore(STORE)
  await Promise.all(
    keys.map(
      (key) =>
        new Promise<void>((resolve) => {
          const request = store.get(key)
          request.onsuccess = () => {
            if (request.result instanceof Float32Array) memory.set(key, request.result)
            resolve()
          }
          request.onerror = () => resolve()
        })
    )
  )
}

async function writeVectors(entries: [string, Float32Array][]) {
  const transaction = (await openDb()).transaction(STORE, "readwrite")
  const store = transaction.objectStore(STORE)
  for (const [key, vector] of entries) store.put(vector, key)
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

/** Reads saved vectors for these cards into memory. Never rejects. */
export async function loadEmbeddings(cards: Card[]) {
  const missing = cardTexts(cards).filter((text) => !memory.has(text))
  if (missing.length === 0) return
  try {
    await readVectors(missing)
  } catch {}
}

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, (response: EmbedResponse) => void>()

function embed(texts: string[]) {
  if (!worker) {
    worker = new Worker(new URL("./embed.worker.ts", import.meta.url), { type: "module" })
    worker.onmessage = (event: MessageEvent<EmbedResponse>) => {
      pending.get(event.data.id)?.(event.data)
      pending.delete(event.data.id)
    }
  }
  const id = nextId++
  return new Promise<Float32Array[]>((resolve, reject) => {
    pending.set(id, (response) =>
      "error" in response ? reject(new Error(response.error)) : resolve(response.vectors)
    )
    worker!.postMessage({ id, texts } satisfies EmbedRequest)
  })
}

// One embedding job at a time, so saving twice doesn't embed the same text twice.
let queue = Promise.resolve()

/**
 * Embeds any card text that doesn't have a vector yet, in the background.
 * Multiple choice falls back to random options until this finishes.
 */
export function embedCards(cards: Card[]) {
  if (typeof window === "undefined" || typeof Worker === "undefined") return
  queue = queue.then(async () => {
    try {
      await loadEmbeddings(cards)
      const missing = cardTexts(cards).filter((text) => !memory.has(text))
      for (let i = 0; i < missing.length; i += BATCH_SIZE) {
        const batch = missing.slice(i, i + BATCH_SIZE)
        const vectors = await embed(batch)
        const entries = batch.map((text, j): [string, Float32Array] => [text, vectors[j]])
        for (const [text, vector] of entries) memory.set(text, vector)
        await writeVectors(entries).catch(() => {})
      }
    } catch {
      // Offline, model download failed, or IndexedDB is blocked. Options stay random.
    }
  })
}
