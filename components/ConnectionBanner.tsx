import React from 'react'
import { Button } from '@/components/ui/button'

interface ConnectionBannerProps {
  error: string | null
  onRetry: () => void
  onReconnect: () => void
}

const ConnectionBanner: React.FC<ConnectionBannerProps> = ({ error, onRetry, onReconnect }) => {
  if (!error) return null

  return (
    <div className="mt-2 p-2 bg-destructive/10 border border-destructive text-destructive rounded flex justify-between items-center">
      <p>Connection lost: {error}</p>
      <div className="space-x-2">
        <Button onClick={onRetry} size="sm" variant="destructive">
          Retry
        </Button>
        <Button onClick={onReconnect} size="sm">
          Reconnect
        </Button>
      </div>
    </div>
  )
}

export default ConnectionBanner