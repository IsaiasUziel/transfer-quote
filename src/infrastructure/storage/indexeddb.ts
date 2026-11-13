import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Quote } from '../../domain/types'
import type { QuoteRepository } from './quote-repository'

interface QuoteDatabase extends DBSchema {
  quotes: {
    key: string
    value: Quote
    indexes: { 'by-created-at': string }
  }
}

// Keep the original namespace so existing browser history remains available.
const DB_NAME = 'elenis-traslados'
const DB_VERSION = 1

export class IndexedDbQuoteRepository implements QuoteRepository {
  private dbPromise: Promise<IDBPDatabase<QuoteDatabase>> | null = null

  private getDb(): Promise<IDBPDatabase<QuoteDatabase>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<QuoteDatabase>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          const store = db.createObjectStore('quotes', { keyPath: 'id' })
          store.createIndex('by-created-at', 'createdAt')
        },
      })
    }

    return this.dbPromise
  }

  async list(): Promise<Quote[]> {
    const db = await this.getDb()
    const quotes = await db.getAllFromIndex('quotes', 'by-created-at')
    return quotes.reverse()
  }

  async save(quote: Quote): Promise<void> {
    const db = await this.getDb()
    await db.put('quotes', quote)
  }

  async remove(id: string): Promise<void> {
    const db = await this.getDb()
    await db.delete('quotes', id)
  }

  async clear(): Promise<void> {
    const db = await this.getDb()
    await db.clear('quotes')
  }
}
