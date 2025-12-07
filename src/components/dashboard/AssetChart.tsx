import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { FTSOAsset, TimeFrame } from '@/lib/types'
import { ChartLine } from '@phosphor-icons/react'
import { useState } from 'react'

interface AssetChartProps {
  asset: FTSOAsset
}

const timeFrames: TimeFrame[] = ['5M', '15M', '1H', '4H']

export function AssetChart({ asset }: AssetChartProps) {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('1H')

  const chartData = asset.priceHistory.map((price, index) => ({
    index,
    price,
  }))

  const getColor = (score: number): string => {
    if (score < 40) return 'oklch(0.75 0.25 145)'
    if (score < 75) return 'oklch(0.70 0.20 60)'
    return 'oklch(0.65 0.30 25)'
  }

  const color = getColor(asset.riskScore)

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartLine className="w-5 h-5 text-accent" weight="fill" />
          <h3 className="text-lg font-semibold">{asset.symbol} Price Chart</h3>
        </div>
        <div className="flex items-center gap-2">
          {timeFrames.map((tf) => (
            <Button
              key={tf}
              onClick={() => setSelectedTimeFrame(tf)}
              variant={selectedTimeFrame === tf ? 'default' : 'outline'}
              size="sm"
              className={
                selectedTimeFrame === tf
                  ? 'bg-accent text-accent-foreground'
                  : 'border-border hover:bg-secondary'
              }
            >
              {tf}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 250)" />
            <XAxis 
              dataKey="index"
              stroke="oklch(0.55 0.05 250)"
              style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }}
            />
            <YAxis 
              stroke="oklch(0.55 0.05 250)"
              style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }}
              domain={['dataMin - 10', 'dataMax + 10']}
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
            <Line
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              dot={false}
              name={asset.symbol}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
