export type ParsedCard = { term: string; definition: string }

export const TERM_SEPARATORS = { tab: "\t", comma: "," } as const
export const CARD_SEPARATORS = { newline: "\n", semicolon: ";" } as const

/**
 * Custom separators are typed into a one-line input, so allow \n and \t
 * escapes for separators that can't be typed there (e.g. "\n\n").
 */
export function unescapeSeparator(value: string) {
  return value.replace(/\\(n|t|\\)/g, (_, char: string) =>
    char === "n" ? "\n" : char === "t" ? "\t" : "\\"
  )
}

/**
 * Splits pasted text into cards, then each card into a term and definition at
 * the first term separator (so definitions may contain the separator).
 * Cards without a separator become a term with an empty definition.
 */
export function parseImport(
  text: string,
  termSeparator: string,
  cardSeparator: string
): ParsedCard[] {
  if (!termSeparator || !cardSeparator) return []

  const cards: ParsedCard[] = []
  for (const chunk of text.replace(/\r\n?/g, "\n").split(cardSeparator)) {
    const at = chunk.indexOf(termSeparator)
    const term = (at === -1 ? chunk : chunk.slice(0, at)).trim()
    const definition = (at === -1 ? "" : chunk.slice(at + termSeparator.length)).trim()
    if (term || definition) cards.push({ term, definition })
  }
  return cards
}
