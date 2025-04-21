"use client"

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import CodeEditor from '@/components/CodeEditor'
import ConsoleOutput from '@/components/ConsoleOutput'
import ConnectionBanner from '@/components/ConnectionBanner'
import { messageSchema } from '@/lib/messageSchemas'
import { parse } from '@babel/parser'
import { retry } from '@/lib/retry'
import { db, saveSnippet, getSnippets, getSnippet, saveConsoleLog, getConsoleLogs, clearConsoleLogs } from '@/lib/db'
import { debounce } from 'lodash'

interface Snippet {
  id?: number;
  code: string;
  name: string;
  createdAt: number;
}

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [code, setCode] = useState('// Write your JavaScript here')
  const [consoleMessages, setConsoleMessages] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [snippetName, setSnippetName] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Load snippets and console logs on mount
  useEffect(() => {
    const loadData = async () => {
      const savedSnippets = await getSnippets()
      setSnippets(savedSnippets)
      const savedLogs = await getConsoleLogs()
      setConsoleMessages(savedLogs.map((log) => log.message))
      if (savedSnippets.length > 0) {
        setCode(savedSnippets[0].code) // Load latest snippet
      }
    }
    loadData()
  }, [])

  // Auto-save code every 5 seconds
  const autoSave = debounce(async (code: string) => {
    await saveSnippet(code, 'Auto-Saved')
    const updatedSnippets = await getSnippets()
    setSnippets(updatedSnippets)
  }, 5000)

  useEffect(() => {
    autoSave(code)
    return () => autoSave.cancel()
  }, [code])

  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = messageSchema.parse(event.data)
        if (['console', 'consoleLog', 'consoleWarn', 'consoleError'].includes(message.type)) {
          const msg = message.payload
          setConsoleMessages((prev) => [...prev, msg])
          saveConsoleLog(msg)
        } else if (message.type === 'result') {
          const msg = message.value
          setConsoleMessages((prev) => [...prev, msg])
          saveConsoleLog(msg)
        } else if (message.type === 'error') {
          const msg = `${message.message}\n${message.stack || ''}`
          setConsoleMessages((prev) => [...prev, msg])
          saveConsoleLog(msg)
        } else if (message.type === 'schemaError') {
          const msg = `Schema Error: ${message.issues}`
          setConsoleMessages((prev) => [...prev, msg])
          saveConsoleLog(msg)
        }
      } catch (error) {
        const msg = `Error: ${error.message}`
        setConsoleMessages((prev) => [...prev, msg])
        saveConsoleLog(msg)
      }
    }
  
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Execute code when "Run" is clicked
  const runCode = () => {
    const iframe = iframeRef.current
    if (iframe && iframe.contentWindow) {
      try {
        parse(code, { sourceType: 'module', errorRecovery: true })
        setConsoleMessages([]) // Clear console before sending the message
        retry(() => {
          return new Promise((resolve) => {
            iframe.contentWindow!.postMessage({ type: 'run', code }, '*')
            setTimeout(() => resolve(true), 100)
          })
        })
          .then(() => {
            setIsConnected(true)
            setConnectionError(null)
            setFailedAttempts(0)
          })
          .catch((error) => {
            setIsConnected(false)
            setConnectionError(error.message)
            setFailedAttempts((prev) => prev + 1)
            setConsoleMessages((prev) => [...prev, `Connection Error: ${error.message}`])
            saveConsoleLog(`Connection Error: ${error.message}`)
          })
      } catch (error) {
        setConsoleMessages((prev) => [...prev, `Syntax Error: ${error.message}`])
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
      setFailedAttempts(0)
      setTimeout(() => runCode(), 500)
    }
  }

  // Clear console output
  const clearConsole = () => {
    setConsoleMessages([])
  }

  // Save snippet
  const handleSaveSnippet = async () => {
    if (snippetName.trim()) {
      await saveSnippet(code, snippetName)
      const updatedSnippets = await getSnippets()
      setSnippets(updatedSnippets)
      setSnippetName('')
    }
  }

  // Load snippet
  const handleLoadSnippet = async (id: number) => {
    const snippet = await getSnippet(id)
    if (snippet) {
      setCode(snippet.code)
    }
  }

  // Clear console log history
  const handleClearHistory = async () => {
    await clearConsoleLogs()
    setConsoleMessages([])
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
          <ConsoleOutput messages={consoleMessages} onClear={clearConsole} />
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