import type { RiskLevel } from '@/lib/types'

interface RiskGaugeProps {
  score: number
}

export function RiskGauge({ score }: RiskGaugeProps) {
  const getRiskLevel = (score: number): RiskLevel => {
    if (score < 40) return 'Safe'
    if (score < 75) return 'Warning'
    return 'Danger'
  }

  const getColor = (score: number): string => {
    if (score < 40) return 'oklch(0.75 0.25 145)'
    if (score < 75) return 'oklch(0.70 0.20 60)'
    return 'oklch(0.65 0.30 25)'
  }

  const riskLevel = getRiskLevel(score)
  const color = getColor(score)
  const radius = 80
  const strokeWidth = 12
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <circle
            stroke="oklch(0.25 0.01 250)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            style={{
              transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease',
              filter: `drop-shadow(0 0 8px ${color})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-5xl font-bold" style={{ color }}>
            {Math.round(score)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">RISK SCORE</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full pulse-glow"
          style={{ backgroundColor: color, color }}
        />
        <span className="text-sm font-medium" style={{ color }}>
          {riskLevel.toUpperCase()}
        </span>
      </div>
    </div>
  )
}
