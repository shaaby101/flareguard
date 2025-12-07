import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { FTSOAsset } from '@/lib/types'
import { ArrowRightLeft, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useFAssets } from '@/hooks/use-flare'

interface FAssetMonitorProps {
  assets: FTSOAsset[]
}

export function FAssetMonitor({ assets }: FAssetMonitorProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC')
  const [chartData, setChartData] = useState<Array<{ time: string; native: number; wrapped: number }>>([])

  // 1. Get Bridge Data for ALL assets
  const fAssetsData = useFAssets(assets)
  
  // 2. Select data for the dropdown choice (Default to safe empty values)
  const currentData = fAssetsData[selectedSymbol] || { 
    nativePrice: 0, 
    fAssetPrice: 0, 
    divergence: 0, 
    bridgeRisk: 'Low' 
  }

  // 3. Reset AND Initialize graph when user switches assets
  useEffect(() => {
    // If we have valid data (price > 0), start the graph immediately with this point
    if (currentData.nativePrice > 0) {
      const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
      })
      
      setChartData([{
        time: timestamp,
        native: currentData.nativePrice,
        wrapped: currentData.fAssetPrice,
      }])
    } else {
      // Only clear if we genuinely have no data
      setChartData([])
    }
  }, [selectedSymbol]) // Only run when symbol changes

  // 4. Update graph with new data points (Live Feed)
  useEffect(() => {
    // Don't plot zeros
    if (!currentData.nativePrice) return

    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
    })

    setChartData((prev) => {
      // Prevent duplicate points with the exact same timestamp
      if (prev.length > 0 && prev[prev.length - 1].time === timestamp) {
        return prev
      }

      // Add new point and keep last 30
      const newData = [
        ...prev,
        {
          time: timestamp,
          native: currentData.nativePrice,
          wrapped: currentData.fAssetPrice,
        },
      ].slice(-30)
      
      return newData
    })
  }, [currentData, selectedSymbol])

  const isHighRisk = currentData.bridgeRisk === 'High'

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold">FAsset Bridge</h3>
          </div>
          
          {/* ASSET SELECTOR */}
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-[100px] h-8 bg-background border-border">
              <SelectValue placeholder="Asset" />
            </SelectTrigger>
            <SelectContent>
              {['BTC', 'ETH', 'XRP', 'FLR', 'SOL'].map((symbol) => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Badge className={isHighRisk ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}>
          {isHighRisk ? (
            <>
              <AlertTriangle className="w-3 h-3 mr-1" />
              HIGH RISK
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              HEALTHY
            </>
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-secondary border border-border">
          <div className="text-xs text-muted-foreground mb-1">Native {selectedSymbol}</div>
          <div className="font-mono text-xl font-bold text-accent">
            ${currentData.nativePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-secondary border border-border">
          <div className="text-xs text-muted-foreground mb-1">F{selectedSymbol} (Wrapped)</div>
          <div className="font-mono text-xl font-bold text-blue-400">
            ${currentData.fAssetPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-secondary border border-border">
          <div className="text-xs text-muted-foreground mb-1">Divergence</div>
          <div className={`font-mono text-xl font-bold ${isHighRisk ? 'text-destructive' : 'text-primary'}`}>
            {currentData.divergence.toFixed(3)}%
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 250)" />
            <XAxis 
              dataKey="time" 
              stroke="oklch(0.55 0.05 250)"
              style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }}
            />
            <YAxis 
              stroke="oklch(0.55 0.05 250)"
              style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }}
              domain={['auto', 'auto']} // Let Recharts scale automatically based on data
              tickFormatter={(val) => `${val.toLocaleString()}`}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'oklch(0.12 0.01 250)',
                border: '1px solid oklch(0.25 0.01 250)',
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono',
              }}
              labelStyle={{ color: 'oklch(0.85 0.12 200)' }}
            />
            <Legend wrapperStyle={{ fontFamily: 'Space Grotesk' }} />
            <Line
              type="monotone"
              dataKey="native"
              name={`Native ${selectedSymbol}`}
              stroke="oklch(0.75 0.25 145)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false} // Disable animation for smoother live updates
            />
            <Line
              type="monotone"
              dataKey="wrapped"
              name={`F${selectedSymbol}`}
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}