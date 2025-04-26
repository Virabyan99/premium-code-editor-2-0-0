import { create } from 'zustand';
import { saveSnippet as dbSaveSnippet, getSnippets, getSnippet, deleteSnippet, saveConsoleLog, getConsoleLogs, clearConsoleLogs } from '@/lib/db';

interface Snippet {
  id?: number;
  code: string;
  name: string;
  createdAt: number;
}

export interface ConsoleEntry {
  id: string;
  message:
    | string
    | { headers: string[]; rows: any[][] }
    | { label: string; duration: number }
    | { label: string; count: number };
  type:
    | 'log'
    | 'warn'
    | 'error'
    | 'table'
    | 'group'
    | 'groupEnd'
    | 'time'
    | 'timeEnd'
    | 'result'
    | 'clear'
    | 'info'
    | 'debug'
    | 'trace'
    | 'assert'
    | 'count';
  groupDepth: number;
}

interface Dialog {
  id: string;
  dialogType: 'alert' | 'confirm' | 'prompt';
  message: string;
  defaultValue?: string;
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
  collapsedGroups: Set<string>;
  timers: Map<string, { type: 'timeout' | 'interval'; id: string }>;
  dialogs: Dialog[];
}

interface Actions {
  setCode: (code: string) => void;
  addConsoleMessage: (
    message: ConsoleEntry['message'],
    type: ConsoleEntry['type'],
    groupDepth: number
  ) => void;
  flushConsoleMessages: () => void;
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
  toggleGroupCollapse: (groupId: string) => void;
  addTimer: (id: string, type: 'timeout' | 'interval') => void;
  removeTimer: (id: string) => void;
  addDialog: (dialog: Dialog) => void;
  removeDialog: (id: string) => void;
}

let messageIdCounter = 0;
let messageQueue: ConsoleEntry[] = [];
let flushTimeout: NodeJS.Timeout | null = null;
const MAX_CONSOLE_MESSAGES = 10000;

const flushMessages = (set: any) => {
  if (messageQueue.length > 0) {
    set((state: State) => {
      let newMessages = [...state.consoleMessages, ...messageQueue];
      if (newMessages.length > MAX_CONSOLE_MESSAGES) {
        newMessages = newMessages.slice(-MAX_CONSOLE_MESSAGES);
      }
      return { consoleMessages: newMessages };
    });
    messageQueue = [];
  }
  flushTimeout = null;
};

export const useStore = create<State & Actions>((set) => ({
  code: `
    alert("Welcome!");
    let ok = confirm("Proceed?");
    if (ok) {
      let name = prompt("Your name?");
      console.log("Hello, " + name);
    }
  `,
  consoleMessages: [],
  isConnected: true,
  connectionError: null,
  failedAttempts: 0,
  snippets: [],
  snippetName: '',
  shouldRunCode: false,
  collapsedGroups: new Set(),
  timers: new Map(),
  dialogs: [],

  setCode: (code) => set({ code }),
  addConsoleMessage: (message, type, groupDepth) => {
    const id = `${messageIdCounter++}`; // Simple incrementing counter
    messageQueue.push({ id, message, type, groupDepth });
    if (!flushTimeout) {
      flushTimeout = setTimeout(() => flushMessages(set), 100);
    }
  },
  flushConsoleMessages: () => flushMessages(set),
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
  addTimer: (id, type) =>
    set((state) => {
      const newTimers = new Map(state.timers);
      newTimers.set(id, { type, id });
      return { timers: newTimers };
    }),
  removeTimer: (id) =>
    set((state) => {
      const newTimers = new Map(state.timers);
      newTimers.delete(id);
      return { timers: newTimers };
    }),
  addDialog: (dialog) =>
    set((state) => ({
      dialogs: [...state.dialogs, dialog],
    })),
  removeDialog: (id) =>
    set((state) => ({
      dialogs: state.dialogs.filter((d) => d.id !== id),
    })),

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