"use client"

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import CodeEditor from '@/components/CodeEditor'

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [code, setCode] = useState('// Write your JavaScript here\n// TODO: Add more code')

  return (
    <div className="container h-[100vh] mx-auto p-3">
      <Button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="mb-2"
      >
        Toggle Theme
      </Button>
      <Card className='h-[90%]'>
        <CardHeader>
          <CardTitle>Welcome to My JS Editor</CardTitle>
        </CardHeader>
        <CardContent className='h-[90%]'>
          <CodeEditor value={code} onChange={setCode} />
        </CardContent>
      </Card>
    </div>
  )
}