import { useState, useRef, useCallback } from 'react'

export interface DataPoint {
  time: string
  symbol: string
  price: number
  volume: number
  rsi: number
  label: number // 0 = Safe, 1 = Pump
}

// Squid Game Token Crash Dataset
const DEMO_DATA: DataPoint[] = [
  { time: '10:00', symbol: 'SQUID', price: 38.50, volume: 12000, rsi: 52, label: 0 },
  { time: '10:01', symbol: 'SQUID', price: 42.10, volume: 15000, rsi: 60, label: 0 },
  { time: '10:02', symbol: 'SQUID', price: 85.00, volume: 45000, rsi: 85, label: 1 }, // Pump starts
  { time: '10:03', symbol: 'SQUID', price: 150.20, volume: 80000, rsi: 92, label: 1 },
  { time: '10:04', symbol: 'SQUID', price: 400.50, volume: 120000, rsi: 95, label: 1 },
  { time: '10:05', symbol: 'SQUID', price: 800.00, volume: 180000, rsi: 98, label: 1 },
  { time: '10:06', symbol: 'SQUID', price: 1200.00, volume: 250000, rsi: 99, label: 1 }, // Peak Euphoria
  { time: '10:07', symbol: 'SQUID', price: 1800.00, volume: 320000, rsi: 99, label: 1 },
  { time: '10:08', symbol: 'SQUID', price: 2400.00, volume: 400000, rsi: 99, label: 1 },
  { time: '10:09', symbol: 'SQUID', price: 2861.00, volume: 550000, rsi: 99, label: 1 }, // All-time High
  { time: '10:10', symbol: 'SQUID', price: 0.003, volume: 200000, rsi: 5, label: 1 },   // RUG PULL
  { time: '10:11', symbol: 'SQUID', price: 0.003, volume: 50000, rsi: 5, label: 1 },
  { time: '10:12', symbol: 'SQUID', price: 0.003, volume: 20000, rsi: 5, label: 1 },
]

// Helper: Clamps a value between 0 and 1
const clamp = (num: number, min = 0, max = 1) => Math.min(Math.max(num, min), max)

export function calculateRisk(currentPoint: DataPoint, previousPoint: DataPoint | null): number {
  if (!previousPoint) return 0 // No risk on first frame

  // 1. Calculate Inputs
  // Normalized Volatility: Simple % change scaled up
  const priceChange = Math.abs((currentPoint.price - previousPoint.price) / previousPoint.price)
  const normalizedVolatility = Math.min(priceChange * 1000, 150) // Cap at 150

  // Volume Signal: If volume is high (>100k), risk increases
  const volumeSignal = clamp(currentPoint.volume / 100000)

  // Pump Probability: Derived from RSI
  const pumpProbability = currentPoint.rsi / 100

  // 2. THE FORMULA
  const totalRisk = clamp(
    (normalizedVolatility / 100) * 0.4 +
    (volumeSignal * 0.2) +
    (pumpProbability * 0.4)
  )

  return Math.round(totalRisk * 100) // Return Score 0-100
}

export function parseCSV(csvText: string): DataPoint[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []
  
  // Skip header, parse each line
  return lines.slice(1).map((line) => {
    const values = line.split(',').map(v => v.trim())
    return {
      time: values[0] || '',
      symbol: values[1] || '',
      price: parseFloat(values[2]) || 0,
      volume: parseFloat(values[3]) || 0,
      rsi: parseFloat(values[4]) || 0,
      label: parseInt(values[5], 10) || 0,
    }
  }).filter(p => p.time && p.symbol && p.price > 0)
}

export interface SimulationStats {
  currentRisk: number
  prediction: number // 0 = Safe, 1 = Pump
  isCorrect: boolean
  accuracy: number
  totalProcessed: number
  correctPredictions: number
}

export function useDemoSimulation() {
  const [displayData, setDisplayData] = useState<DataPoint[]>([])
  const [stats, setStats] = useState<SimulationStats>({
    currentRisk: 0,
    prediction: 0,
    isCorrect: false,
    accuracy: 0,
    totalProcessed: 0,
    correctPredictions: 0,
  })
  const [isSimulating, setIsSimulating] = useState(false)
  const [dataSource, setDataSource] = useState<'demo' | 'csv'>('demo')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const indexRef = useRef<number>(0)
  const dataRef = useRef<DataPoint[]>([])

  const startDemo = useCallback((data?: DataPoint[]) => {
    // Clear any existing simulation
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Use provided data or default demo data
    const simulationData = data || DEMO_DATA
    dataRef.current = simulationData
    setDataSource(data ? 'csv' : 'demo')

    // Reset state
    setDisplayData([])
    setStats({
      currentRisk: 0,
      prediction: 0,
      isCorrect: false,
      accuracy: 0,
      totalProcessed: 0,
      correctPredictions: 0,
    })
    setIsSimulating(true)
    indexRef.current = 0

    // Start simulation
    intervalRef.current = setInterval(() => {
      const index = indexRef.current

      if (index >= simulationData.length) {
        // Simulation complete
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setIsSimulating(false)
        return
      }

      const currentPoint = simulationData[index]
      const previousPoint = index > 0 ? simulationData[index - 1] : null

      // Calculate risk
      const risk = calculateRisk(currentPoint, previousPoint)
      
      // Make prediction: if risk > 75, predict Pump (1), else Safe (0)
      const prediction = risk > 75 ? 1 : 0
      
      // Check if prediction is correct
      const isCorrect = prediction === currentPoint.label
      
      // Update stats
      setStats((prev) => {
        const newCorrect = prev.correctPredictions + (isCorrect ? 1 : 0)
        const newTotal = prev.totalProcessed + 1
        const accuracy = newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 0

        return {
          currentRisk: risk,
          prediction,
          isCorrect,
          accuracy,
          totalProcessed: newTotal,
          correctPredictions: newCorrect,
        }
      })

      // Add new data point
      setDisplayData((prev) => [...prev, currentPoint])

      indexRef.current++
    }, 500) // 500ms per data point

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const stopDemo = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsSimulating(false)
  }, [])

  const resetDemo = useCallback(() => {
    stopDemo()
    setDisplayData([])
    setStats({
      currentRisk: 0,
      prediction: 0,
      isCorrect: false,
      accuracy: 0,
      totalProcessed: 0,
      correctPredictions: 0,
    })
    indexRef.current = 0
  }, [stopDemo])

  return {
    displayData,
    stats,
    isSimulating,
    dataSource,
    startDemo,
    stopDemo,
    resetDemo,
  }
}
