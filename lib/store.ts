import { create } from 'zustand'
import { saveSnippet as dbSaveSnippet, getSnippets, getSnippet, deleteSnippet, saveConsoleLog, getConsoleLogs, clearConsoleLogs } from '@/lib/db'

interface Snippet {
  id?: number
  code: string
  name: string
  createdAt: number
}

export interface ConsoleEntry {
  message: string
  type: 'log' | 'warn' | 'error' | 'result'
}

interface State {
  code: string
  consoleMessages: ConsoleEntry[]
  isConnected: boolean
  connectionError: string | null
  failedAttempts: number
  snippets: Snippet[]
  snippetName: string
  shouldRunCode: boolean
}

interface Actions {
  setCode: (code: string) => void
  addConsoleMessage: (entry: ConsoleEntry) => void
  setConsoleMessages: (messages: ConsoleEntry[]) => void
  clearConsoleMessages: () => void
  setIsConnected: (connected: boolean) => void
  setConnectionError: (error: string | null) => void
  incrementFailedAttempts: () => void
  resetFailedAttempts: () => void
  setSnippets: (snippets: Snippet[]) => void
  setSnippetName: (name: string) => void
  saveSnippet: (code: string, name: string) => Promise<void>
  loadSnippet: (id: number) => Promise<void>
  clearConsoleLogs: () => Promise<void>
  deleteSnippet: (id: number) => Promise<void>
  setShouldRunCode: (value: boolean) => void
}

export const useStore = create<State & Actions>((set) => ({
  code: '// Write your JavaScript here',
  consoleMessages: [],
  isConnected: true,
  connectionError: null,
  failedAttempts: 0,
  snippets: [],
  snippetName: '',
  shouldRunCode: false,

  setCode: (code) => set({ code }),
  addConsoleMessage: (entry) => set((state) => ({ consoleMessages: [...state.consoleMessages, entry] })),
  setConsoleMessages: (messages) => set({ consoleMessages: messages }),
  clearConsoleMessages: () => set({ consoleMessages: [] }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setConnectionError: (error) => set({ connectionError: error }),
  incrementFailedAttempts: () => set((state) => ({ failedAttempts: state.failedAttempts + 1 })),
  resetFailedAttempts: () => set({ failedAttempts: 0 }),
  setSnippets: (snippets) => set({ snippets }),
  setSnippetName: (name) => set({ snippetName: name }),
  setShouldRunCode: (value) => set({ shouldRunCode: value }),

  saveSnippet: async (code, name) => {
    await dbSaveSnippet(code, name)
    const updatedSnippets = await getSnippets()
    set({ snippets: updatedSnippets })
  },

  loadSnippet: async (id) => {
    const snippet = await getSnippet(id)
    if (snippet) {
      set({ code: snippet.code })
    }
  },

  clearConsoleLogs: async () => {
    await clearConsoleLogs()
    set({ consoleMessages: [] })
  },

  deleteSnippet: async (id) => {
    await deleteSnippet(id)
    const updatedSnippets = await getSnippets()
    set({ snippets: updatedSnippets })
  },
}))