"use client"

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import CodeEditor from '@/components/CodeEditor'
import ConsoleOutput from '@/components/ConsoleOutput'
import { messageSchema } from '@/lib/messageSchemas'
import { parse } from '@babel/parser'

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [code, setCode] = useState('// Write your JavaScript here')
  const [consoleMessages, setConsoleMessages] = useState<string[]>([])
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
    try {
      // Parse code to catch syntax errors
      parse(code, { sourceType: 'module', errorRecovery: true })
      if (iframeRef.current && iframeRef.current.contentWindow) {
        setConsoleMessages([]) // Clear console before running new code
        iframeRef.current.contentWindow.postMessage({ type: 'run', code }, '*')
      }
    } catch (error) {
      setConsoleMessages((prev) => [...prev, `Syntax Error: ${error.message}`])
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
        <Button onClick={runCode}>Run</Button>
      </div>
      {/* Split Screen */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Half: Code Editor */}
        <div className="w-1/2 p-2">
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