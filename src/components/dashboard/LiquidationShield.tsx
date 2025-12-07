import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Shield, CheckCircle } from '@phosphor-icons/react'

interface LiquidationShieldProps {
  isEnabled: boolean
  onToggle: (enabled: boolean) => void
  lastTopUpTime: number | null
}

export function LiquidationShield({ isEnabled, onToggle, lastTopUpTime }: LiquidationShieldProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <Card className={`
      p-6 
      bg-card 
      border-2 
      transition-all
      ${isEnabled ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'}
    `}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield 
            className={`w-8 h-8 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`}
            weight="fill" 
          />
          <div>
            <h3 className="text-lg font-semibold">Liquidation Shield</h3>
            <p className="text-xs text-muted-foreground">Auto-protect collateral on high risk</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Label htmlFor="auto-protect" className="text-sm font-medium cursor-pointer">
            {isEnabled ? 'Active' : 'Disabled'}
          </Label>
          <Switch 
            id="auto-protect" 
            checked={isEnabled} 
            onCheckedChange={onToggle}
          />
        </div>
      </div>

      {isEnabled && (
        <div className="mt-4 p-4 bg-secondary rounded-lg border border-primary/30">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" weight="fill" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">
                Protection Protocol Active
              </p>
              <p className="text-xs text-muted-foreground">
                When risk score exceeds 85, smart account will automatically deposit 500 FLR to prevent liquidation
              </p>
              {lastTopUpTime && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Last top-up: <span className="font-mono text-primary">{formatTime(lastTopUpTime)}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isEnabled && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            Enable auto-protect to automatically top up collateral when market conditions become dangerous
          </p>
        </div>
      )}
    </Card>
  )
}
