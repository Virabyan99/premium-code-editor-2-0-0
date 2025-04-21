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

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [code, setCode] = useState('// Write your JavaScript here')
  const [consoleMessages, setConsoleMessages] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = messageSchema.parse(event.data)
        if (['console', 'consoleLog', 'consoleWarn', 'consoleError'].includes(message.type)) {
          setConsoleMessages((prev) => [...prev, message.payload])
        } else if (message.type === 'result') {
          setConsoleMessages((prev) => [...prev, message.value])
        } else if (message.type === 'error') {
          setConsoleMessages((prev) => [...prev, `${message.message}\n${message.stack || ''}`])
        } else if (message.type === 'schemaError') {
          setConsoleMessages((prev) => [...prev, `Schema Error: ${message.issues}`])
        }
      } catch (error) {
        setConsoleMessages((prev) => [...prev, `Error: ${error.message}`])
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
          })
      } catch (error) {
        setConsoleMessages((prev) => [...prev, `Syntax Error: ${error.message}`])
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
          <CodeEditor value={code} onChange={setCode} />
        </div>
        {/* Right Half: Console Output */}
        <div className="w-1/2 p-2">
          <ConsoleOutput messages={consoleMessages} onClear={clearConsole} />
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