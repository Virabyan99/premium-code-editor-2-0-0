import React, { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { IconTrash, IconCopy } from '@tabler/icons-react'
import { ConsoleEntry } from '@/lib/store'

interface ConsoleOutputProps {
  messages: ConsoleEntry[]
  onClear: () => void
}

const ConsoleOutput: React.FC<ConsoleOutputProps> = ({ messages, onClear }) => {
  const consoleRef = useRef<HTMLDivElement>(null)
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div
      ref={consoleRef}
      className="relative h-full p-2 bg-gray-100 dark:bg-gray-800 border rounded overflow-auto"
    >
      <Button
        onClick={onClear}
        variant="ghost"
        size="sm"
        className="absolute top-0 right-2"
      >
        <IconTrash size={16} />
      </Button>
      {messages.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          Console output will appear here...
        </p>
      )}
      {messages.map((entry, index) => (
        <div key={index} className="text-sm mb-1 flex items-start">
          <pre
            className={`whitespace-pre-wrap flex-1 ${
              entry.type === 'error'
                ? 'text-red-600'
                : entry.type === 'warn'
                ? 'text-yellow-600'
                : 'text-black dark:text-white'
            }`}
          >
            {entry.message}
          </pre>
          {(entry.type === 'error' || entry.message.includes('Syntax Error')) && (
            <Button
              onClick={() => copyToClipboard(entry.message)}
              size="sm"
              variant="secondary"
              className="ml-2"
            >
              <IconCopy size={16} />
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

export default ConsoleOutput