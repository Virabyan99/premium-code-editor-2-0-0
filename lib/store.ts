import { create } from 'zustand';
import { saveSnippet as dbSaveSnippet, getSnippets, getSnippet, deleteSnippet, saveConsoleLog, getConsoleLogs, clearConsoleLogs } from '@/lib/db';

interface Snippet {
  id?: number;
  code: string;
  name: string;
  createdAt: number;
}

export interface ConsoleEntry {
  id: number;
  message: string | { headers: string[]; rows: any[][] } | { label: string; duration: number };
  type: 'log' | 'warn' | 'error' | 'table' | 'group' | 'groupEnd' | 'time' | 'timeEnd' | 'result';
  groupDepth: number;
}

interface State {
  code: string;
  consoleMessages: ConsoleEntry[];
  isConnected: boolean;
  connectionError: string | null;
  failedAttempts: number;
  snippets: Snippet[];
  snippetName: string;
  shouldRunCode: boolean;
  collapsedGroups: Set<number>;
}

interface Actions {
  setCode: (code: string) => void;
  addConsoleMessage: (
    message: string | { headers: string[]; rows: any[][] } | { label: string; duration: number },
    type: ConsoleEntry['type'],
    groupDepth: number
  ) => void;
  setConsoleMessages: (messages: ConsoleEntry[]) => void;
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
  setShouldRunCode: (value: boolean) => void;
  toggleGroupCollapse: (groupId: number) => void;
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
  collapsedGroups: new Set(),

  setCode: (code) => set({ code }),
  addConsoleMessage: (message, type, groupDepth) =>
    set((state) => ({
      consoleMessages: [
        ...state.consoleMessages,
        { id: Date.now(), message, type, groupDepth },
      ],
    })),
  setConsoleMessages: (messages) => set({ consoleMessages: messages }),
  clearConsoleMessages: () => set({ consoleMessages: [], collapsedGroups: new Set() }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setConnectionError: (error) => set({ connectionError: error }),
  incrementFailedAttempts: () => set((state) => ({ failedAttempts: state.failedAttempts + 1 })),
  resetFailedAttempts: () => set({ failedAttempts: 0 }),
  setSnippets: (snippets) => set({ snippets }),
  setSnippetName: (name) => set({ snippetName: name }),
  setShouldRunCode: (value) => set({ shouldRunCode: value }),
  toggleGroupCollapse: (groupId) =>
    set((state) => {
      const newCollapsed = new Set(state.collapsedGroups);
      if (newCollapsed.has(groupId)) {
        newCollapsed.delete(groupId);
      } else {
        newCollapsed.add(groupId);
      }
      return { collapsedGroups: newCollapsed };
    }),

  saveSnippet: async (code, name) => {
    await dbSaveSnippet(code, name);
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