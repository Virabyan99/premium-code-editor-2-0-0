import { create } from 'zustand';
import { saveSnippet, getSnippets, getSnippet, deleteSnippet, saveConsoleLog, getConsoleLogs, clearConsoleLogs } from '@/lib/db';

interface Snippet {
  id?: number;
  code: string;
  name: string;
  createdAt: number;
}

interface State {
  code: string;
  consoleMessages: string[];
  isConnected: boolean;
  connectionError: string | null;
  failedAttempts: number;
  snippets: Snippet[];
  snippetName: string;
}

interface Actions {
  setCode: (code: string) => void;
  addConsoleMessage: (message: string) => void;
  setConsoleMessages: (messages: string[]) => void;
  clearConsoleMessages: () => void;
  setIsConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  incrementFailedAttempts: () => void;
  resetFailedAttempts: () => void;
  setSnippets: (snippets: Snippet[]) => void;
  setSnippetName: (name: string) => void;
  saveSnippet: (code: string, name: string) => Promise<void>;
  loadSnippet: (id: number) => Promise<void>;
  clearConsoleLogs: () => Promise<void>;
  deleteSnippet: (id: number) => Promise<void>;
}

export const useStore = create<State & Actions>((set) => ({
  code: '// Write your JavaScript here',
  consoleMessages: [],
  isConnected: true,
  connectionError: null,
  failedAttempts: 0,
  snippets: [],
  snippetName: '',

  setCode: (code) => set({ code }),
  addConsoleMessage: (message) => set((state) => ({ consoleMessages: [...state.consoleMessages, message] })),
  setConsoleMessages: (messages) => set({ consoleMessages: messages }),
  clearConsoleMessages: () => set({ consoleMessages: [] }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setConnectionError: (error) => set({ connectionError: error }),
  incrementFailedAttempts: () => set((state) => ({ failedAttempts: state.failedAttempts + 1 })),
  resetFailedAttempts: () => set({ failedAttempts: 0 }),
  setSnippets: (snippets) => set({ snippets }),
  setSnippetName: (name) => set({ snippetName: name }),

  saveSnippet: async (code, name) => {
    await saveSnippet(code, name);
    const updatedSnippets = await getSnippets();
    set({ snippets: updatedSnippets });
  },

  loadSnippet: async (id) => {
    const snippet = await getSnippet(id);
    if (snippet) {
      set({ code: snippet.code });
    }
  },

  clearConsoleLogs: async () => {
    await clearConsoleLogs();
    set({ consoleMessages: [] });
  },

  deleteSnippet: async (id) => {
    await deleteSnippet(id);
    const updatedSnippets = await getSnippets();
    set({ snippets: updatedSnippets });
  },
}));