import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { LogEntry, SmartAccountStatus, FDCVerification } from '@/lib/types'
import { Terminal, Shield, CheckCircle2, AlertCircle, Loader2, Zap } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface SystemLogsProps {
  logs: LogEntry[]
  smartAccountStatus: SmartAccountStatus
  fdcVerification: FDCVerification
}

export function SystemLogs({ logs, smartAccountStatus, fdcVerification }: SystemLogsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-3 h-3 text-primary" />
      case 'WARNING':
        return <AlertCircle className="w-3 h-3 text-[oklch(0.70_0.20_60)]" />
      case 'ERROR':
        return <AlertCircle className="w-3 h-3 text-destructive" />
      default:
        return <Terminal className="w-3 h-3 text-accent" />
    }
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'SUCCESS':
        return 'text-primary'
      case 'WARNING':
        return 'text-[oklch(0.70_0.20_60)]'
      case 'ERROR':
        return 'text-destructive'
      default:
        return 'text-foreground'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getFDCStatusBadge = () => {
    switch (fdcVerification.status) {
      case 'REQUESTING':
        return (
          <Badge className="bg-accent text-accent-foreground">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            REQUESTING ATTESTATION
          </Badge>
        )
      case 'VERIFIED':
        return (
          <Badge className="bg-primary text-primary-foreground">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            VERIFIED
          </Badge>
        )
      case 'FAILED':
        return (
          <Badge className="bg-destructive text-destructive-foreground">
            <AlertCircle className="w-3 h-3 mr-1" />
            FAILED
          </Badge>
        )
      default:
        return (
          <Badge className="bg-muted text-muted-foreground">
            IDLE
          </Badge>
        )
    }
  }

  const getSmartAccountBadge = () => {
    switch (smartAccountStatus.status) {
      case 'PENDING':
        return (
          <Badge className="bg-[oklch(0.70_0.20_60)] text-primary-foreground">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            PENDING
          </Badge>
        )
      case 'EXECUTED':
        return (
          <Badge className="bg-primary text-primary-foreground">
            <Zap className="w-3 h-3 mr-1" />
            EXECUTED
          </Badge>
        )
      default:
        return (
          <Badge className="bg-muted text-muted-foreground">
            IDLE
          </Badge>
        )
    }
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <Terminal className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold">System Console</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded-lg bg-secondary border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Terminal className="w-4 h-4" />
              FDC Verification
            </div>
            {getFDCStatusBadge()}
          </div>
          {fdcVerification.requestId && (
            <div className="font-mono text-xs text-muted-foreground">
              Request ID: {fdcVerification.requestId}
            </div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-secondary border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              Smart Account
            </div>
            {getSmartAccountBadge()}
          </div>
          {smartAccountStatus.lastAction && (
            <div className="font-mono text-xs text-muted-foreground truncate">
              {smartAccountStatus.lastAction}
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="h-64 rounded-lg bg-secondary border border-border p-4">
        <div ref={scrollRef} className="space-y-2 font-mono text-xs">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 opacity-90 hover:opacity-100 transition-opacity">
              {getLogIcon(log.type)}
              <span className="text-muted-foreground min-w-[80px]">
                [{formatTimestamp(log.timestamp)}]
              </span>
              <span className={getLogColor(log.type)}>{log.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}
