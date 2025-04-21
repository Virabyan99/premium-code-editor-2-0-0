import React from 'react'
import { Button } from '@/components/ui/button'
import { IconTrash } from '@tabler/icons-react'


interface ConsoleOutputProps {
  messages: string[]
  onClear: () => void
}

const ConsoleOutput: React.FC<ConsoleOutputProps> = ({ messages, onClear }) => {
  return (
    <div className="relative h-full p-2 bg-gray-100 dark:bg-gray-800 border rounded overflow-auto">
      <Button
        onClick={onClear}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2"
      >
        <IconTrash size={16} />
      </Button>
      {messages.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          Console output will appear here...
        </p>
      )}
      {messages.map((msg, index) => (
        <p key={index} className="text-sm">
          {msg}
        </p>
      ))}
    </div>
  )
}

export default ConsoleOutput