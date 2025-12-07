import { Card } from '@/components/ui/card'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface RiskHistoryChartProps {
  data: Array<{ timestamp: number; score: number }>
}

export function RiskHistoryChart({ data }: RiskHistoryChartProps) {
  const chartData = data.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    score: Math.round(point.score),
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      const getRiskColor = (score: number) => {
        if (score < 33) return 'oklch(0.75 0.25 145)'
        if (score < 66) return 'oklch(0.70 0.20 60)'
        return 'oklch(0.65 0.30 25)'
      }

      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-xl">
          <p className="text-xs text-muted-foreground mb-1">{payload[0].payload.time}</p>
          <p className="font-bold text-lg" style={{ color: getRiskColor(value) }}>
            Risk: {value}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground mb-1 tracking-wider uppercase">
          Risk Score Trend
        </h2>
        <p className="text-xs text-muted-foreground">Last Hour • Live Updates</p>
      </div>
      
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.65 0.25 250)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="oklch(0.65 0.25 250)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 250)" />
          <XAxis 
            dataKey="time" 
            stroke="oklch(0.55 0.05 250)"
            style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
          />
          <YAxis 
            stroke="oklch(0.55 0.05 250)"
            domain={[0, 100]}
            style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="oklch(0.65 0.25 250)" 
            strokeWidth={2}
            fill="url(#riskGradient)" 
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
