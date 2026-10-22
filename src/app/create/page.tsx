"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { SetForm } from "@/components/set-form"
import { createSet } from "@/lib/sets"

export default function CreateSetPage() {
  const router = useRouter()
  // Bumped after a save so coming back to this (kept-alive) page starts blank.
  const [formKey, setFormKey] = useState(0)

  return (
    <>
      <title>Create a new set | Quizzical</title>
      <SetForm
        key={formKey}
        heading="Create a new flashcard set"
        submitLabel="Create"
        onSubmit={(input) => {
          try {
            const set = createSet(input)
            setFormKey((key) => key + 1)
            router.push(`/sets/${set.id}`)
          } catch (error) {
            toast.error((error as Error).message)
          }
        }}
      />
    </>
  )
}
