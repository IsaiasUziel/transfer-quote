import type { Quote } from '../../domain/types'

export interface MergeQuotesResult {
  quotes: Quote[]
  addedQuotes: Quote[]
  skipped: number
}

export function mergeQuotes(
  existing: Quote[],
  imported: Quote[],
): MergeQuotesResult {
  const knownIds = new Set(existing.map((quote) => quote.id))
  const addedQuotes: Quote[] = []
  let skipped = 0

  for (const quote of imported) {
    if (knownIds.has(quote.id)) {
      skipped += 1
      continue
    }

    knownIds.add(quote.id)
    addedQuotes.push(quote)
  }

  const quotes = [...existing, ...addedQuotes].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )

  return { quotes, addedQuotes, skipped }
}
