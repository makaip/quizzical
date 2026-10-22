"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FolderIcon, LayersIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { FolderDialog } from "@/components/folder-dialogs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createFolder } from "@/lib/folders"

export function CreateMenu() {
  const router = useRouter()
  const [folderOpen, setFolderOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="ml-auto">
            <PlusIcon data-icon="inline-start" />
            Create
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href="/create">
              <LayersIcon />
              Flashcard set
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setFolderOpen(true)}>
            <FolderIcon />
            Folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FolderDialog
        open={folderOpen}
        onOpenChange={setFolderOpen}
        title="Create a new folder"
        submitLabel="Create folder"
        onSubmit={(input) => {
          try {
            const folder = createFolder(input)
            setFolderOpen(false)
            router.push(`/folders/${folder.id}`)
          } catch (error) {
            toast.error((error as Error).message)
          }
        }}
      />
    </>
  )
}
