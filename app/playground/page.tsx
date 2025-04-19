"use client"

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import CodeEditor from '@/components/CodeEditor'
import ConsoleOutput from '@/components/ConsoleOutput'
import { messageSchema, Message } from '@/lib/messageSchemas'

export default function Playground() {
  const { theme } = useTheme()
  const [code, setCode] = useState('console.log("Hello, Sandbox!");')
  const [consoleMessages, setConsoleMessages] = useState<string[]>([])
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'run', code }, '*')
    }
  }, [code])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = messageSchema.parse(event.data) as Message;
        if (message.type === 'console') {
          setConsoleMessages((prev) => [...prev, message.payload]);
          if (message.payload === 'console.log("Welcome to the Sandbox!");') {
            setCode(message.payload);
          }
        } else if (message.type === 'schemaError') {
          setConsoleMessages((prev) => [...prev, `Schema Error: ${message.issues}`]);
        }
      } catch (error) {
        setConsoleMessages((prev) => [...prev, `Validation Error: ${error.message}`]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const resetSandbox = () => {
    if (iframeRef.current) {
      iframeRef.current.src = '/sandbox.html'
    }
  }

  const resetToDefault = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'resetToDefault' }, '*');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Playground</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeEditor value={code} onChange={setCode} />
          <div className="mt-2 space-x-2">
            <Button onClick={resetSandbox}>
              Reset Sandbox
            </Button>
            <Button onClick={resetToDefault} variant="secondary">
              Reset to Default
            </Button>
          </div>
          <ConsoleOutput messages={consoleMessages} />
          <iframe
            ref={iframeRef}
            sandbox="allow-scripts"
            src="/sandbox.html"
            className="w-full h-64 border mt-4"
            title="Code Sandbox"
          />
        </CardContent>
      </Card>
    </div>
  )
}