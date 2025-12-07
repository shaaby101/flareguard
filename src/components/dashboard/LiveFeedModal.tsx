import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { FTSOAsset } from '@/lib/types'
import { TrendUp, TrendDown, X } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'

interface LiveFeedModalProps {
  asset: FTSOAsset | null
  isOpen: boolean
  onClose: () => void
  livePrices?: Record<string, { price: number; timestamp: number }>
}

export function LiveFeedModal({ asset, isOpen, onClose, livePrices }: LiveFeedModalProps) {
  const [liveData, setLiveData] = useState<Array<{ time: string; price: number; volatility: number }>>([])
  const [isLive, setIsLive] = useState(true)

  useEffect(() => {
    if (!asset || !isOpen) return

    // Generate live chart data from price history
    const generateLiveData = () => {
      const now = new Date()
      return asset.priceHistory.slice(-60).map((price, idx) => {
        const time = new Date(now.getTime() - (60 - idx) * 1000)
        return {
          time: time.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          }),
          price,
          volatility: asset.volatility + (Math.random() - 0.5) * 2,
        }
      })
    }

    const initial = generateLiveData()
    // If an external live price is available for this asset, ensure the latest datapoint
    // reflects the exact live price so UI and modal match immediately.
    const external = (livePrices && asset) ? livePrices[asset.symbol] : undefined
    if (external && initial.length > 0) {
      const last = { ...initial[initial.length - 1] }
      last.price = parseFloat(external.price.toFixed(asset.symbol === 'XRP' ? 4 : 2))
      last.time = new Date(external.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      initial[initial.length - 1] = last
    }

    setLiveData(initial)

    // If external livePrices are provided for this symbol, skip internal simulation
    const hasExternal = !!(livePrices && asset && livePrices[asset.symbol])
    if (hasExternal) return

    if (!isLive) return

    // Simulate live updates every 500ms when external data not available
    const interval = setInterval(() => {
      setLiveData((prev) => {
        const now = new Date()
        const newPrice = asset.price + (Math.random() - 0.5) * 10
        const newVolatility = asset.volatility + (Math.random() - 0.5) * 2

        return [
          ...prev.slice(-59),
          {
            time: now.toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            price: parseFloat(newPrice.toFixed(2)),
            volatility: parseFloat(Math.max(0, newVolatility).toFixed(2)),
          },
        ]
      })
    }, 500)

    return () => clearInterval(interval)
  }, [asset, isOpen, isLive])

  // If livePrices prop updates for this symbol, append that value in real-time
  useEffect(() => {
    if (!asset || !isOpen || !livePrices) return
    const live = livePrices[asset.symbol]
    if (!live) return

    setLiveData((prev) => {
      const now = new Date(live.timestamp)
      const item = {
        time: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        price: parseFloat(live.price.toFixed(asset.symbol === 'XRP' ? 4 : 2)),
        volatility: asset.volatility
      }
      return [...prev.slice(-59), item]
    })
}, [livePrices, asset, isOpen])

  if (!asset) return null

  const getRiskColor = (score: number) => {
    if (score < 40) return 'bg-[oklch(0.75_0.25_145)] text-[oklch(0.05_0.01_250)]'
    if (score < 75) return 'bg-[oklch(0.70_0.20_60)] text-[oklch(0.05_0.01_250)]'
    return 'bg-[oklch(0.65_0.30_25)] text-white'
  }

  const getRiskLabel = (score: number) => {
    if (score < 40) return 'SAFE'
    if (score < 75) return 'WARNING'
    return 'DANGER'
  }

  const getChartColor = (score: number): string => {
    if (score < 40) return 'oklch(0.75 0.25 145)'
    if (score < 75) return 'oklch(0.70 0.20 60)'
    return 'oklch(0.65 0.30 25)'
  }

  const priceChange = liveData.length >= 2 
    ? ((liveData[liveData.length - 1].price - liveData[0].price) / liveData[0].price) * 100
    : 0

  const isPositive = priceChange >= 0
  const chartColor = getChartColor(asset.riskScore)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden bg-card border-border p-0 flex flex-col">
        <DialogHeader className="relative px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between w-full">
            <div>
              <DialogTitle className="text-2xl font-bold">
                {asset.symbol} Live Feed Monitor
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">{asset.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 px-6 py-4">
          {/* Real-time Price Display */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 bg-secondary border-border">
                <div className="text-xs text-muted-foreground mb-2">Current Price</div>
                {(() => {
                  const external = livePrices && asset ? livePrices[asset.symbol] : undefined
                  const displayPrice = external ? external.price : asset.price
                  return (
                    <div className="text-3xl font-bold text-accent mb-1">
                      ${displayPrice.toFixed(asset.symbol === 'XRP' ? 4 : 2)}
                    </div>
                  )
                })()}
              <div className={`flex items-center gap-2 text-sm ${isPositive ? 'text-primary' : 'text-destructive'}`}>
                {isPositive ? (
                  <TrendUp className="w-4 h-4" />
                ) : (
                  <TrendDown className="w-4 h-4" />
                )}
                <span className="font-mono font-bold text-sm">{Math.abs(priceChange).toFixed(2)}%</span>
              </div>
            </Card>

            <Card className="p-4 bg-secondary border-border">
              <div className="text-xs text-muted-foreground mb-2">Risk Assessment</div>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-bold font-mono">
                  {Math.round(asset.riskScore)}
                </div>
                <Badge className={`${getRiskColor(asset.riskScore)} text-sm px-3 py-1`}>
                  {getRiskLabel(asset.riskScore)}
                </Badge>
              </div>
            </Card>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-4 gap-2">
            <Card className="p-3 bg-secondary border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Volatility
              </div>
              <div className="text-xl font-bold font-mono text-accent">
                {asset.volatility.toFixed(2)}%
              </div>
            </Card>

            <Card className="p-3 bg-secondary border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Acceleration
              </div>
              <div className="text-xl font-bold font-mono text-accent">
                {asset.acceleration.toFixed(2)}%
              </div>
            </Card>

            <Card className="p-3 bg-secondary border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Price Range (24h)
              </div>
              <div className="text-xs font-mono text-foreground leading-tight">
                {(() => {
                  const external = livePrices && asset ? livePrices[asset.symbol] : undefined
                  const displayPrice = external ? external.price : asset.price
                  return (
                    <>
                      <div>H: ${displayPrice.toFixed(2)}</div>
                      <div>L: ${(displayPrice * 0.95).toFixed(2)}</div>
                    </>
                  )
                })()}
              </div>
            </Card>

            <Card className="p-3 bg-secondary border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Data Points
              </div>
              <div className="text-xl font-bold font-mono text-accent">
                {liveData.length}
              </div>
            </Card>
          </div>

          {/* Live Chart */}
          <Card className="p-4 bg-secondary border-border flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-base font-semibold">Real-time Price Movement</h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                <span className="text-xs text-muted-foreground">
                  {isLive ? 'LIVE' : 'PAUSED'}
                </span>
              </div>
            </div>

            <div className="h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={liveData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 250)" />
                  <XAxis 
                    dataKey="time"
                    stroke="oklch(0.55 0.05 250)"
                    style={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                    tick={{ fill: 'oklch(0.55 0.05 250)' }}
                  />
                  <YAxis 
                    stroke="oklch(0.55 0.05 250)"
                    style={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                    tick={{ fill: 'oklch(0.55 0.05 250)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.12 0.01 250)',
                      border: '2px solid oklch(0.25 0.01 250)',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '12px'
                    }}
                    labelStyle={{ color: chartColor }}
                    formatter={(value: any) => [
                      value.toFixed(asset.symbol === 'XRP' ? 4 : 2),
                      'Price'
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={chartColor}
                    strokeWidth={2}
                    dot={false}
                    name={`${asset.symbol} Price`}
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Status Information */}
          <Card className="p-3 bg-secondary border-border flex-shrink-0">
            <h4 className="font-semibold text-sm mb-2">Live Feed Status</h4>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block">Last Update</span>
                <div className="font-mono text-foreground text-xs">
                  {new Date().toLocaleTimeString('en-US', { hour12: false })}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block">Update Frequency</span>
                <div className="font-mono text-foreground text-xs">500ms</div>
              </div>
              <div>
                <span className="text-muted-foreground block">Data Points</span>
                <div className="font-mono text-foreground text-xs">
                  {asset.priceHistory.length} samples
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block">Connection</span>
                <div className="font-mono text-primary text-xs">CONNECTED</div>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
