"use client"

import { useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import CodeEditor from '@/components/CodeEditor'
import ConsoleOutput from '@/components/ConsoleOutput'
import ConnectionBanner from '@/components/ConnectionBanner'
import { messageSchema } from '@/lib/messageSchemas'
import { parse } from '@babel/parser'
import { retry } from '@/lib/retry'
import { useStore } from '@/lib/store'
import { getSnippets, getConsoleLogs, saveConsoleLog } from '@/lib/db'
import { debounce } from 'lodash'

export default function Home() {
  const { theme, setTheme } = useTheme()
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
    snippetName,
    setSnippetName,
    saveSnippet,
    loadSnippet,
    clearConsoleLogs,
  } = useStore()

  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Load snippets and console logs on mount
  useEffect(() => {
    const loadData = async () => {
      const savedSnippets = await getSnippets()
      setSnippets(savedSnippets)
      const savedLogs = await getConsoleLogs()
      setConsoleMessages(savedLogs.map((log) => log.message))
      if (savedSnippets.length > 0) {
        setCode(savedSnippets[0].code)
      }
    }
    loadData()
  }, [setSnippets, setConsoleMessages, setCode])

  // Auto-save code every 5 seconds
  const autoSave = debounce(async (code: string) => {
    await saveSnippet(code, 'Auto-Saved')
    const updatedSnippets = await getSnippets()
    setSnippets(updatedSnippets)
  }, 5000)

  useEffect(() => {
    autoSave(code)
    return () => autoSave.cancel()
  }, [code, saveSnippet, setSnippets])

  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = messageSchema.parse(event.data)
        if (['console', 'consoleLog', 'consoleWarn', 'consoleError'].includes(message.type)) {
          const msg = message.payload
          addConsoleMessage(msg)
          saveConsoleLog(msg)
        } else if (message.type === 'result') {
          const msg = message.value
          addConsoleMessage(msg)
          saveConsoleLog(msg)
        } else if (message.type === 'error') {
          const msg = `${message.message}\n${message.stack || ''}`
          addConsoleMessage(msg)
          saveConsoleLog(msg)
        } else if (message.type === 'schemaError') {
          const msg = `Schema Error: ${message.issues}`
          addConsoleMessage(msg)
          saveConsoleLog(msg)
        }
      } catch (error) {
        const msg = `Error: ${error.message}`
        addConsoleMessage(msg)
        saveConsoleLog(msg)
      }
    }
  
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [addConsoleMessage])

  // Execute code when "Run" is clicked
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
            addConsoleMessage(`Connection Error: ${error.message}`)
            saveConsoleLog(`Connection Error: ${error.message}`)
          })
      } catch (error) {
        addConsoleMessage(`Syntax Error: ${error.message}`)
        saveConsoleLog(`Syntax Error: ${error.message}`)
      }
    }
  }

  // Reconnect by reloading the iframe
  const reconnect = () => {
    if (iframeRef.current) {
      iframeRef.current.src = '/sandbox.html'
      setIsConnected(true)
      setConnectionError(null)
      resetFailedAttempts()
      setTimeout(() => runCode(), 500)
    }
  }

  // Save snippet
  const handleSaveSnippet = async () => {
    if (snippetName.trim()) {
      await saveSnippet(code, snippetName)
      setSnippetName('')
    }
  }

  // Load snippet
  const handleLoadSnippet = async (id: number) => {
    await loadSnippet(id)
  }

  // Clear console log history
  const handleClearHistory = async () => {
    await clearConsoleLogs()
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar */}
      <div className="flex justify-between p-2 border-b">
        <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          Toggle Theme
        </Button>
        <Button onClick={runCode} disabled={!isConnected}>
          Run
        </Button>
      </div>
      {/* Split Screen */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Half: Code Editor */}
        <div className="w-1/2 p-2">
          {failedAttempts >= 3 && (
            <div className="mb-2 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
              <p>Repeated connection failures. Please reload the page.</p>
              <Button
                onClick={() => window.location.reload()}
                size="sm"
                className="mt-1 bg-yellow-500 hover:bg-yellow-600"
              >
                Reload
              </Button>
            </div>
          )}
          <ConnectionBanner error={connectionError} onRetry={runCode} onReconnect={reconnect} />
          <div className="mt-2 flex space-x-2">
            <input
              type="text"
              value={snippetName}
              onChange={(e) => setSnippetName(e.target.value)}
              placeholder="Snippet name"
              className="p-2 border rounded flex-1"
            />
            <Button
              onClick={handleSaveSnippet}
              disabled={!snippetName.trim()}
            >
              Save Snippet
            </Button>
          </div>
          <div className="mt-2">
            <select
              onChange={(e) => handleLoadSnippet(Number(e.target.value))}
              className="p-2 border rounded w-full"
              defaultValue=""
            >
              <option value="" disabled>
                Load Snippet
              </option>
              {snippets.map((snippet) => (
                <option key={snippet.id} value={snippet.id}>
                  {snippet.name} ({new Date(snippet.createdAt).toLocaleString()})
                </option>
              ))}
            </select>
          </div>
          <CodeEditor value={code} onChange={setCode} />
        </div>
        {/* Right Half: Console Output */}
        <div className="w-1/2 p-2">
          <ConsoleOutput messages={consoleMessages} onClear={() => setConsoleMessages([])} />
          <Button onClick={handleClearHistory} className="mt-2">
            Clear History
          </Button>
        </div>
      </div>
      {/* Hidden Iframe for Code Execution */}
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