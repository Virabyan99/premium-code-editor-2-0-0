"use client"

import { useRef, useEffect } from 'react'
import CodeEditor from '@/components/CodeEditor'
import ConsoleOutput from '@/components/ConsoleOutput'
import ConnectionBanner from '@/components/ConnectionBanner'
import { messageSchema } from '@/lib/messageSchemas'
import { parse } from '@babel/parser'
import { retry } from '@/lib/retry'
import { useStore } from '@/lib/store'
import { getSnippets, getConsoleLogs, saveConsoleLog, db } from '@/lib/db'
import { debounce } from 'lodash'

export default function Home() {
  const {
    code,
    setCode,
    consoleMessages,
    addConsoleMessage,
    setConsoleMessages,
    isConnected,
    setIsConnected,
    connectionError,
    setConnectionError,
    failedAttempts,
    incrementFailedAttempts,
    resetFailedAttempts,
    snippets,
    setSnippets,
    shouldRunCode,
    setShouldRunCode,
    clearConsoleLogs, // Added from store
  } = useStore()

  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const loadData = async () => {
      const savedSnippets = await getSnippets();
      setSnippets(savedSnippets);
      const savedLogs = await getConsoleLogs();
      setConsoleMessages(
        savedLogs.map((log) => {
          try {
            const parsed = JSON.parse(log.message);
            if (typeof parsed === 'object' && parsed.message && parsed.type) {
              return parsed; // Valid ConsoleEntry with message and type
            } else {
              // JSON parsed successfully but lacks required properties
              return { message: log.message, type: 'log' };
            }
          } catch {
            // JSON parsing failed (e.g., plain string or invalid JSON)
            return { message: log.message, type: 'log' };
          }
        })
      );
      if (savedSnippets.length > 0) {
        setCode(savedSnippets[0].code);
      }
    };
    loadData();
  }, [setSnippets, setConsoleMessages, setCode]);

  const autoSave = debounce(async (code: string) => {
    const updatedSnippets = await getSnippets()
    const autoSavedExists = updatedSnippets.some(s => s.name === 'Auto-Saved')
    if (!autoSavedExists && code.trim()) {
      await db.snippets.add({ code, name: 'Auto-Saved', createdAt: Date.now() })
    } else if (autoSavedExists && code.trim()) {
      const autoSavedSnippet = updatedSnippets.find(s => s.name === 'Auto-Saved')
      if (autoSavedSnippet) {
        await db.snippets.update(autoSavedSnippet.id!, { code, createdAt: Date.now() })
      }
    }
    const refreshedSnippets = await getSnippets()
    setSnippets(refreshedSnippets)
  }, 5000)

  useEffect(() => {
    autoSave(code)
    return () => autoSave.cancel()
  }, [code])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = messageSchema.parse(event.data)
        if (message.type === 'console') {
          const msg = { message: message.payload, type: message.method }
          addConsoleMessage(msg)
          saveConsoleLog(JSON.stringify(msg))
        } else if (message.type === 'result') {
          const msg = { message: message.value, type: 'result' }
          addConsoleMessage(msg)
          saveConsoleLog(JSON.stringify(msg))
        } else if (message.type === 'error') {
          const msg = { message: `${message.message}\n${message.stack || ''}`, type: 'error' }
          addConsoleMessage(msg)
          saveConsoleLog(JSON.stringify(msg))
        } else if (message.type === 'schemaError') {
          const msg = { message: `Schema Error: ${message.issues}`, type: 'error' }
          addConsoleMessage(msg)
          saveConsoleLog(JSON.stringify(msg))
        }
      } catch (error) {
        const msg = { message: `Error: ${error instanceof Error ? error.message : String(error)}`, type: 'error' }
        addConsoleMessage(msg)
        saveConsoleLog(JSON.stringify(msg))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [addConsoleMessage])

  const runCode = () => {
    const iframe = iframeRef.current
    if (iframe && iframe.contentWindow) {
      try {
        parse(code, { sourceType: 'module', errorRecovery: true })
        setConsoleMessages([])
        retry(() => {
          return new Promise((resolve) => {
            iframe.contentWindow!.postMessage({ type: 'run', code }, '*')
            setTimeout(() => resolve(true), 100)
          })
        })
          .then(() => {
            setIsConnected(true)
            setConnectionError(null)
            resetFailedAttempts()
          })
          .catch((error) => {
            setIsConnected(false)
            setConnectionError(error.message)
            incrementFailedAttempts()
            addConsoleMessage({ message: `Connection Error: ${error.message}`, type: 'error' })
            saveConsoleLog(JSON.stringify({ message: `Connection Error: ${error.message}`, type: 'error' }))
          })
      } catch (error) {
        const msg = { message: `Syntax Error: ${error instanceof Error ? error.message : String(error)}`, type: 'error' }
        addConsoleMessage(msg)
        saveConsoleLog(JSON.stringify(msg))
      }
    }
  }

  useEffect(() => {
    if (shouldRunCode) {
      runCode()
      setShouldRunCode(false)
    }
  }, [shouldRunCode, runCode, setShouldRunCode])

  const reconnect = () => {
    if (iframeRef.current) {
      iframeRef.current.src = '/sandbox.html'
      setIsConnected(true)
      setConnectionError(null)
      resetFailedAttempts()
      setTimeout(() => runCode(), 500)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 p-2">
          {failedAttempts >= 3 && (
            <div className="mb-2 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
              <p>Repeated connection failures. Please reload the page.</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-1 bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-sm"
              >
                Reload
              </button>
            </div>
          )}
          <ConnectionBanner error={connectionError} onRetry={runCode} onReconnect={reconnect} />
          <CodeEditor value={code} onChange={setCode} />
        </div>
        <div className="w-1/2 p-2">
          <ConsoleOutput messages={consoleMessages} onClear={clearConsoleLogs} />
        </div>
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        src="/sandbox.html"
        style={{ display: 'none' }}
        title="Code Sandbox"
      />
    </div>
  )
}