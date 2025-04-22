'use client'

import { useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useStore } from '@/lib/store'
import {
  IconSun,
  IconMoon,
  IconPlayerPlay,
  IconDeviceFloppy,
  IconFolder,
  IconTrash,
  IconUpload,
  IconDownload,
} from '@tabler/icons-react'
import { parse } from 'acorn'

export default function Toolbar() {
  const { theme, setTheme } = useTheme()
  const {
    code,
    snippets,
    setCode,
    setShouldRunCode,
    clearConsoleMessages,
    saveSnippet,
    loadSnippet,
    deleteSnippet,
  } = useStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSaveOpen, setIsSaveOpen] = useState(false)
  const [saveInput, setSaveInput] = useState('')

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleRunCode = () => {
    setShouldRunCode(true)
  }

  const handleSaveSnippet = async () => {
    if (saveInput.trim()) {
      await saveSnippet(code, saveInput)
      setSaveInput('')
      setIsSaveOpen(false)
    }
  }

  const handleUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 1024 * 1024) {
      console.error('File size exceeds 1MB')
      return
    }

    if (!file.name.endsWith('.js')) {
      console.error('Only .js files are allowed')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const fileContent = event.target?.result as string
      try {
        parse(fileContent, { ecmaVersion: 'latest' })
        setCode(fileContent)
      } catch (error) {
        console.error('Invalid JavaScript file')
      }
    }
    reader.readAsText(file)
  }

  const handleDownload = () => {
    if (code.length === 0) {
      console.error('Editor is empty')
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${timestamp}.js`
    const blob = new Blob([code], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-800 border-b">
      <Button variant="ghost" size="icon" onClick={handleThemeToggle}>
        {theme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
      </Button>
      <Button variant="ghost" size="icon" onClick={handleRunCode}>
        <IconPlayerPlay size={20} />
      </Button>
      <Popover open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon">
            <IconDeviceFloppy size={20} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <Input
              value={saveInput}
              onChange={(e) => setSaveInput(e.target.value)}
              placeholder="Snippet name"
            />
            <Button onClick={handleSaveSnippet} disabled={!saveInput.trim()}>
              Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <IconFolder size={20} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          {snippets.length === 0 ? (
            <DropdownMenuItem disabled>No snippets available</DropdownMenuItem>
          ) : (
            snippets.map((snippet) => (
              <div
                key={snippet.id}
                className="flex justify-between items-center px-2 py-1">
                <span
                  onClick={() => loadSnippet(snippet.id!)}
                  className="cursor-pointer flex-1 truncate">
                  {snippet.name} ({new Date(snippet.createdAt).toLocaleString()}
                  )
                </span>
                <Button
                  onClick={async () => await deleteSnippet(snippet.id!)}
                  variant="ghost"
                  size="sm">
                  <IconTrash size={16} />
                </Button>
              </div>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" size="icon" onClick={clearConsoleMessages}>
        <IconTrash size={20} />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleUpload}>
        <IconUpload size={20} />
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".js"
        className="hidden"
      />
      <Button variant="ghost" size="icon" onClick={handleDownload}>
        <IconDownload size={20} />
      </Button>
    </div>
  )
}
