import Dexie, { Table } from 'dexie'

interface Snippet {
  id?: number
  code: string
  name: string
  createdAt: number
}

interface ConsoleLog {
  id?: number
  message: string
  timestamp: number
}

class EditorDB extends Dexie {
  snippets!: Table<Snippet>
  consoleLogs!: Table<ConsoleLog>

  constructor() {
    super('EditorDB')
    this.version(1).stores({
      snippets: '++id, name, createdAt',
      consoleLogs: '++id, timestamp',
    })
  }
}

export const db = new EditorDB()

export async function saveSnippet(code: string, name: string): Promise<number> {
  return db.snippets.add({
    code,
    name,
    createdAt: Date.now(),
  })
}

export async function getSnippets(): Promise<Snippet[]> {
  return db.snippets.orderBy('createdAt').reverse().toArray()
}

export async function getSnippet(id: number): Promise<Snippet | undefined> {
  return db.snippets.get(id)
}

export async function deleteSnippet(id: number): Promise<void> {
  return db.snippets.delete(id)
}

export async function saveConsoleLog(message: string): Promise<number> {
  return db.consoleLogs.add({
    message,
    timestamp: Date.now(),
  })
}

export async function getConsoleLogs(): Promise<ConsoleLog[]> {
  return db.consoleLogs.orderBy('timestamp').reverse().toArray()
}

export async function clearConsoleLogs(): Promise<void> {
  return db.consoleLogs.clear()
}