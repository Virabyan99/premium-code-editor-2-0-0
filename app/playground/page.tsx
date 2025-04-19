"use client"

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import CodeEditor from '@/components/CodeEditor'

export default function Playground() {
  const { theme } = useTheme()
  const [code, setCode] = useState('console.log("Hello, Sandbox!");')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'run', code }, '*')
    }
  }, [code])

  const resetSandbox = () => {
    if (iframeRef.current) {
      iframeRef.current.src = '/sandbox.html'
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Playground</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeEditor value={code} onChange={setCode} />
          <Button onClick={resetSandbox} className="mt-2">
            Reset Sandbox
          </Button>
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