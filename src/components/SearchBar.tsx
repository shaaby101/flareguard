import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MagnifyingGlass, ShieldCheck, WarningCircle } from '@phosphor-icons/react'

const INSTITUTIONAL_WHITELIST = ['BTC', 'ETH', 'XRP', 'FLR', 'SOL', 'USDC']

interface SearchBarProps {
  onAssetSelect?: (symbol: string) => void
}

export function SearchBar({ onAssetSelect }: SearchBarProps) {
  const [input, setInput] = useState('')
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid'>('idle')

  const handleInputChange = (value: string) => {
    const normalized = value.toUpperCase().trim()
    setInput(normalized)

    if (normalized === '') {
      setValidationState('idle')
      return
    }

    if (INSTITUTIONAL_WHITELIST.includes(normalized)) {
      setValidationState('valid')
    } else {
      setValidationState('invalid')
    }
  }

  const handleSelect = () => {
    if (validationState === 'valid' && onAssetSelect) {
      onAssetSelect(input)
      setInput('')
      setValidationState('idle')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && validationState === 'valid') {
      handleSelect()
    }
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Institutional Asset Search</h2>
          <p className="text-sm text-muted-foreground">
            Only Blue-Chip Assets: {INSTITUTIONAL_WHITELIST.join(', ')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" 
            />
            <Input
              id="asset-search-input"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter ticker symbol (BTC, ETH, etc.)"
              className={`
                pl-11 pr-4 py-6 text-lg font-mono tracking-wider
                transition-all duration-300
                ${validationState === 'valid' ? 'border-primary shadow-[0_0_12px_rgba(0,255,100,0.3)] bg-primary/5' : ''}
                ${validationState === 'invalid' ? 'border-destructive shadow-[0_0_12px_rgba(255,70,70,0.4)] bg-destructive/5 animate-shake' : ''}
                ${validationState === 'idle' ? 'border-border' : ''}
              `}
            />
          </div>

          {validationState === 'valid' && (
            <Button
              onClick={handleSelect}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg font-semibold shadow-lg shadow-primary/20"
            >
              <ShieldCheck className="w-5 h-5 mr-2" weight="fill" />
              Select
            </Button>
          )}
        </div>

        {validationState === 'valid' && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/30 animate-fadeIn">
            <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0" weight="fill" />
            <div>
              <p className="text-sm font-semibold text-primary">Verified Blue-Chip Asset</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {input} is whitelisted for institutional monitoring
              </p>
            </div>
          </div>
        )}

        {validationState === 'invalid' && (
          <div 
            className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border-2 border-destructive/50 animate-fadeIn"
          >
            <WarningCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" weight="fill" />
            <div>
              <p className="text-sm font-bold text-destructive">⛔ Security Alert: High-Risk/Unverified Asset</p>
              <p className="text-xs text-destructive/80 mt-1 leading-relaxed">
                <strong>"{input}"</strong> is not supported on FlareGuard. 
                We only monitor institutional-grade blue-chip assets to ensure data integrity and risk accuracy.
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Supported: {INSTITUTIONAL_WHITELIST.join(' • ')}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
