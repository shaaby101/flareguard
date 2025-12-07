import { Card } from '@/components/ui/card'
import { Pulse } from '@phosphor-icons/react'

interface FTSOHeartbeatProps {
  lastUpdate: number
  isPulsing: boolean
  isLiveMode: boolean
}

export function FTSOHeartbeat({ lastUpdate, isPulsing, isLiveMode }: FTSOHeartbeatProps) {
  
  // Internal helper to format the date
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
  }

  return (
    <Card 
      className={`
        p-4 
        bg-card 
        border-2 
        transition-all 
        duration-300
        ${isPulsing 
          ? 'border-primary shadow-[0_0_30px_rgba(118,255,195,0.5)] scale-105' 
          : 'border-border'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Pulse 
              className={`w-8 h-8 ${isPulsing ? 'text-primary' : 'text-muted-foreground'}`} 
              weight="fill" 
            />
            
            {isPulsing && (
              <div className="absolute inset-0 animate-ping">
                <Pulse className="w-8 h-8 text-primary opacity-75" weight="fill" />
              </div>
            )}
          </div>
          
          <div>
            <div className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              FTSO V2 Heartbeat
            </div>
            <div className="text-sm text-foreground font-medium">
              ~1.8s Block Latency
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Last Update</div>
          <div className="font-mono text-lg font-bold text-primary">
            {formatTime(lastUpdate)}
          </div>
        </div>
      </div>

      {/* Progress Bar Animation */}
      <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-accent"
          style={{
            width: isPulsing ? '100%' : '0%',
            transition: isPulsing ? 'width 0.1s ease-out' : 'width 1.8s linear'
          }}
        />
      </div>
    </Card>
  )
}