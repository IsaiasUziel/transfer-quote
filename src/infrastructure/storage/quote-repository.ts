import type { Quote } from '../../domain/types'

export interface QuoteRepository {
  list(): Promise<Quote[]>
  save(quote: Quote): Promise<void>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}
