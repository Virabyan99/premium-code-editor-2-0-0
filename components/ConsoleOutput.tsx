import React from 'react'
import { Button } from '@/components/ui/button'
import { IconTrash, IconCopy } from '@tabler/icons-react'

interface ConsoleOutputProps {
  messages: string[]
  onClear: () => void
}

const ConsoleOutput: React.FC<ConsoleOutputProps> = ({ messages, onClear }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="relative h-full p-2 bg-gray-100 dark:bg-gray-800 border rounded overflow-auto">
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
      {messages.map((msg, index) => (
        <div key={index} className="text-sm mb-1  flex items-start">
          <pre className="whitespace-pre-wrap flex-1">{msg}</pre>
          {(msg.includes('Error:') || msg.includes('Syntax Error')) && (
            <Button
              onClick={() => copyToClipboard(msg)}
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