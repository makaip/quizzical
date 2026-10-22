import ReactMarkdown, { type Components, type Options } from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { cn } from "@/lib/utils"

const remarkPlugins: Options["remarkPlugins"] = [remarkGfm, remarkMath, remarkBreaks]
const rehypePlugins: Options["rehypePlugins"] = [
  [rehypeKatex, { throwOnError: false, strict: "ignore" }],
]

const components: Components = {
  a: ({ href, title, children }) => (
    <a
      href={href}
      title={title}
      target="_blank"
      rel="noopener noreferrer"
      // Links sit inside a clickable flashcard; following one shouldn't flip it.
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  ),
}

// Code spans and fenced blocks, which must be left exactly as typed.
const CODE = /(```[\s\S]*?```|`[^`\n]*`)/

/**
 * remark-math only understands $...$ and $$...$$, but LaTeX copied from
 * elsewhere often uses \(...\) and \[...\]. Convert those outside code.
 */
function normalizeMath(text: string) {
  return text
    .split(CODE)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part
            .replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => `$$${math}$$`)
            .replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => `$${math}$`)
    )
    .join("")
}

/** Renders Markdown with GFM and LaTeX math. Raw HTML is not rendered. */
export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("rich-text", className)}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {normalizeMath(text)}
      </ReactMarkdown>
    </div>
  )
}
