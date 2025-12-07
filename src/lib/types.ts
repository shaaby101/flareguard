export interface PumpSignals {
  rsiOverheat: number
  orderBookThinness: number
  volumePriceMismatch: number
}

export interface FTSOAsset {
  symbol: string
  name: string
  price: number
  volatility: number
  acceleration: number
  riskScore: number
  priceHistory: number[]
  volumeSignal: number
  pumpProbability: number
  pumpSignals: PumpSignals
}

export interface FAssetData {
  nativePrice: number
  fAssetPrice: number
  divergence: number
  bridgeRisk: 'Low' | 'High'
}

export interface SmartAccountStatus {
  status: 'IDLE' | 'PENDING' | 'EXECUTED'
  lastAction: string | null
  timestamp: number | null
}

export interface FDCVerification {
  status: 'IDLE' | 'REQUESTING' | 'VERIFIED' | 'FAILED'
  requestId: string | null
  timestamp: number | null
}

export interface LogEntry {
  id: string
  timestamp: number
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  message: string
}

export type RiskLevel = 'Safe' | 'Warning' | 'Danger'

export type TimeFrame = '5M' | '15M' | '1H' | '4H'

export interface WalletState {
  address: string | null
  flrBalance: string | null
  isConnected: boolean
  isConnecting: boolean
}

export interface AppMode {
  isLiveMode: boolean
  isConnectedToRPC: boolean
}
