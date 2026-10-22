"use client"

import { clearLearnState } from "@/lib/learn"
import { createLocalStore } from "@/lib/local-store"
import { createId } from "@/lib/utils"

export type Folder = {
  id: string
  name: string
  description: string
  /** Sets in this folder, in the order they were added. A set can be in several folders. */
  setIds: string[]
  createdAt: number
  updatedAt: number
}

export type FolderInput = Pick<Folder, "name" | "description">

function isFolder(value: unknown): value is Folder {
  if (!value || typeof value !== "object") return false
  const folder = value as Record<string, unknown>
  return (
    typeof folder.id === "string" &&
    typeof folder.name === "string" &&
    Array.isArray(folder.setIds)
  )
}

// Stored as `{ folders }` because the store only holds objects.
const store = createLocalStore("recall:folders:v1", (value): { folders: Folder[] } => {
  const folders = (value as { folders?: unknown } | undefined)?.folders
  return { folders: Array.isArray(folders) ? folders.filter(isFolder) : [] }
})

function save(folders: Folder[]) {
  store.set({ folders })
}

function getFolders() {
  return store.get().folders
}

/** All folders. `null` until the client has read storage. */
export function useFolders(): Folder[] | null {
  return store.useValue()?.folders ?? null
}

/** `undefined` while loading, `null` if no folder has this id. */
export function useFolder(id: string): Folder | null | undefined {
  const folders = useFolders()
  if (folders === null) return undefined
  return folders.find((folder) => folder.id === id) ?? null
}

export function createFolder(input: FolderInput, setIds: string[] = []): Folder {
  const now = Date.now()
  const folder: Folder = { ...input, id: createId(), setIds, createdAt: now, updatedAt: now }
  save([folder, ...getFolders()])
  return folder
}

export function updateFolder(id: string, input: FolderInput) {
  save(
    getFolders().map((folder) =>
      folder.id === id ? { ...folder, ...input, updatedAt: Date.now() } : folder
    )
  )
}

export function setInFolder(folderId: string, setId: string, included: boolean) {
  save(
    getFolders().map((folder) => {
      if (folder.id !== folderId) return folder
      const rest = folder.setIds.filter((id) => id !== setId)
      return {
        ...folder,
        setIds: included ? [...rest, setId] : rest,
        updatedAt: Date.now(),
      }
    })
  )
}

export function deleteFolder(id: string) {
  save(getFolders().filter((folder) => folder.id !== id))
  try {
    clearLearnState(id)
  } catch {}
}

/** Takes a deleted set out of every folder. */
export function removeSetFromFolders(setId: string) {
  const folders = getFolders()
  if (!folders.some((folder) => folder.setIds.includes(setId))) return
  save(
    folders.map((folder) => ({
      ...folder,
      setIds: folder.setIds.filter((id) => id !== setId),
    }))
  )
}
