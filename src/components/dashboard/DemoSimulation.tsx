import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useDemoSimulation, parseCSV, DataPoint } from '@/hooks/use-demo-simulation'
import { Play, Stop, ArrowsClockwise, Upload } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

export function DemoSimulation() {
  const { displayData, stats, isSimulating, dataSource, startDemo, stopDemo, resetDemo } = useDemoSimulation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<string>('')

  const getRiskColor = (risk: number) => {
    if (risk >= 80) return 'text-red-500'
    if (risk >= 60) return 'text-orange-500'
    if (risk >= 40) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getRiskLabel = (risk: number) => {
    if (risk >= 80) return 'EXTREME RISK'
    if (risk >= 60) return 'HIGH RISK'
    if (risk >= 40) return 'MODERATE RISK'
    return 'LOW RISK'
  }

  const getPredictionStatus = (prediction: number) => {
    return prediction === 1 ? '⚠️ PUMP DETECTED' : '✅ SAFE'
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string
        const parsedData = parseCSV(csvText)
        
        if (parsedData.length === 0) {
          toast.error('❌ Invalid CSV format or no data found')
          return
        }

        setSelectedFile(file.name)
        toast.success(`✅ Loaded ${parsedData.length} data points from ${file.name}`)
        
        // Start simulation with CSV data
        startDemo(parsedData)
      } catch (error) {
        toast.error('❌ Error parsing CSV file')
        console.error(error)
      }
    }
    reader.readAsText(file)
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Pump & Dump Simulation</h3>
          <p className="text-xs text-muted-foreground">
            {dataSource === 'csv' 
              ? `CSV Upload: ${selectedFile}` 
              : 'Squid Game Token Crash (Demo Dataset)'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge className={`${getRiskColor(stats.currentRisk)} bg-secondary text-lg px-4 py-2`}>
            Risk: {stats.currentRisk}% - {getRiskLabel(stats.currentRisk)}
          </Badge>
          
          <Badge className="bg-secondary text-primary">
            {getPredictionStatus(stats.prediction)}
          </Badge>

          <Badge className={stats.isCorrect ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}>
            {stats.isCorrect ? '✅ Correct' : '❌ Wrong'}
          </Badge>
          
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {!isSimulating ? (
              <>
                <Button 
                  onClick={triggerFileUpload}
                  variant="outline"
                  size="sm"
                  className="border-border"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV
                </Button>
                
                <Button 
                  onClick={() => startDemo()}
                  className="bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" weight="fill" />
                  Import Demo
                </Button>
              </>
            ) : (
              <Button 
                onClick={stopDemo} 
                variant="destructive"
                size="sm"
              >
                <Stop className="w-4 h-4 mr-2" weight="fill" />
                Stop
              </Button>
            )}
            
            <Button 
              onClick={resetDemo} 
              variant="outline"
              size="sm"
              disabled={isSimulating}
            >
              <ArrowsClockwise className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Accuracy Stats */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <div className="p-4 rounded-lg bg-secondary border border-border">
          <div className="text-xs text-muted-foreground mb-1">Current Price</div>
          <div className="font-mono text-lg font-bold text-accent">
            ${displayData.length > 0 ? displayData[displayData.length - 1].price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>
        
        <div className="p-4 rounded-lg bg-secondary border border-border">
          <div className="text-xs text-muted-foreground mb-1">Volume</div>
          <div className="font-mono text-lg font-bold text-blue-400">
            {displayData.length > 0 ? displayData[displayData.length - 1].volume.toLocaleString() : '0'}
          </div>
        </div>
        
        <div className="p-4 rounded-lg bg-secondary border border-border">
          <div className="text-xs text-muted-foreground mb-1">RSI</div>
          <div className="font-mono text-lg font-bold text-purple-400">
            {displayData.length > 0 ? displayData[displayData.length - 1].rsi : '0'}
          </div>
        </div>
        
        <div className="p-4 rounded-lg bg-secondary border border-border">
          <div className="text-xs text-muted-foreground mb-1">Processed</div>
          <div className="font-mono text-lg font-bold text-primary">
            {stats.totalProcessed}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-secondary border border-border">
          <div className="text-xs text-muted-foreground mb-1">Correct</div>
          <div className="font-mono text-lg font-bold text-green-500">
            {stats.correctPredictions}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="text-xs text-green-600 mb-1 font-bold">MODEL ACCURACY</div>
          <div className="font-mono text-2xl font-bold text-green-500">
            {stats.accuracy}%
          </div>
        </div>
      </div>

      {/* Live Chart */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 250)" />
            <XAxis 
              dataKey="time" 
              stroke="oklch(0.55 0.05 250)"
              style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }}
            />
            <YAxis 
              stroke="oklch(0.55 0.05 250)"
              style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }}
              domain={['auto', 'auto']}
              tickFormatter={(val) => `$${val.toLocaleString()}`}
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
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
            />
            <Legend wrapperStyle={{ fontFamily: 'Space Grotesk' }} />
            <Line
              type="monotone"
              dataKey="price"
              name="Token Price"
              stroke="oklch(0.75 0.25 145)"
              strokeWidth={3}
              dot={{ fill: 'oklch(0.75 0.25 145)', r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Status Messages */}
      {stats.currentRisk > 75 && displayData.length > 0 && (
        <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50 mb-4">
          <p className="text-red-500 font-bold text-center">
            🚨 HIGH RISK DETECTED - Pump probability exceeds threshold
          </p>
        </div>
      )}

      {displayData.length > 0 && displayData.length === (dataSource === 'csv' ? displayData.length : 13) && !isSimulating && (
        <div className="p-4 rounded-lg bg-destructive/20 border border-destructive">
          <p className="text-destructive font-bold text-center">
            ✅ SIMULATION COMPLETE - Final Accuracy: {stats.accuracy}%
          </p>
        </div>
      )}
    </Card>
  )
}
