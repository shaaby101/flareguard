import { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserProvider, formatEther } from 'ethers'
import type {
  FTSOAsset,
  FAssetData,
  SmartAccountStatus,
  FDCVerification,
  LogEntry,
  WalletState,
  TimeFrame,
  PumpSignals
} from '@/lib/types'
import { useLivePrices } from './use-live-prices'
import { useExtensionStorage } from './useExtensionStorage'

// 1. Defined Asset Names for dynamic creation (No prices here)
const ASSET_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  XRP: 'Ripple',
  FLR: 'Flare',
  SOL: 'Solana'
}

const INSTITUTIONAL_WHITELIST = Object.keys(ASSET_NAMES)

const HISTORY_LENGTH = 20
const RSI_PERIOD = 7
const PUMP_WEIGHTS = {
  rsiOverheat: 0.45,
  orderBookThinness: 0.35,
  volumePriceMismatch: 0.2
} as const

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(Math.max(value, min), max)

// --- MATH FUNCTIONS ---

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length
  const variance =
    prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
  const stdDev = Math.sqrt(variance)
  return (stdDev / mean) * 100
}

function calculateAcceleration(prices: number[]): number {
  if (prices.length < 3) return 0
  const recentChange = prices[prices.length - 1] - prices[prices.length - 2]
  const previousChange = prices[prices.length - 2] - prices[prices.length - 3]
  return Math.abs(recentChange - previousChange)
}

function calculateRSI(prices: number[], period = RSI_PERIOD): number {
  if (prices.length < period + 1) return 0
  let gains = 0
  let losses = 0

  for (let i = prices.length - period; i < prices.length; i++) {
    const delta = prices[i] - prices[i - 1]
    if (delta >= 0) gains += delta
    else losses += Math.abs(delta)
  }

  if (losses === 0) return 1
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 1

  const rs = avgGain / avgLoss
  const rsi = 100 - 100 / (1 + rs)
  return clamp((rsi - 70) / 30)
}

function calculateOrderBookThinness(
  volatilityPct: number,
  accelerationPct: number
): number {
  const volMetric = clamp(volatilityPct / 100)
  const accelMetric = clamp(accelerationPct / 100)

  if (volMetric === 0) return clamp(accelMetric * 0.5)

  const ratio = accelMetric / Math.max(volMetric, 0.01)
  return clamp(ratio / 2)
}

function calculateVolumePriceMismatch(
  priceChangePct: number,
  volumeSignal: number
): number {
  const priceMomentum = clamp(Math.abs(priceChangePct) / 6)
  return clamp(Math.max(priceMomentum - volumeSignal, 0))
}

function combinePumpProbability(signals: PumpSignals): number {
  return clamp(
    signals.rsiOverheat * PUMP_WEIGHTS.rsiOverheat +
      signals.orderBookThinness * PUMP_WEIGHTS.orderBookThinness +
      signals.volumePriceMismatch * PUMP_WEIGHTS.volumePriceMismatch
  )
}

function updateVolumeSignal(previous: number, priceChangePct: number): number {
  const target = clamp(Math.abs(priceChangePct) / 8)
  return clamp(previous * 0.7 + target * 0.3)
}

function createInitialPumpSignals(): PumpSignals {
  return {
    rsiOverheat: 0,
    orderBookThinness: 0,
    volumePriceMismatch: 0
  }
}

function createAsset(symbol: string, name: string, price: number): FTSOAsset {
  return {
    symbol,
    name,
    price,
    volatility: 0,
    acceleration: 0,
    riskScore: 0,
    priceHistory: Array(HISTORY_LENGTH).fill(price),
    volumeSignal: 0,
    pumpProbability: 0,
    pumpSignals: createInitialPumpSignals()
  }
}

function calculateAssetMetrics(asset: FTSOAsset, newPrice: number): FTSOAsset {
  const previousPrice = asset.priceHistory[asset.priceHistory.length - 1]
  const newHistory = [...asset.priceHistory, newPrice].slice(-HISTORY_LENGTH)

  const volatility = calculateVolatility(newHistory)
  const acceleration = calculateAcceleration(newHistory)

  const denominator = Math.max(newPrice, 1e-8)
  const normalizedVolatility = Math.min((volatility / denominator) * 100, 100)
  const normalizedAcceleration = Math.min((acceleration / denominator) * 100, 100)

  const priceChangePct =
    previousPrice > 0 ? ((newPrice - previousPrice) / previousPrice) * 100 : 0

  const updatedVolumeSignal = updateVolumeSignal(
    asset.volumeSignal,
    priceChangePct
  )

  const pumpSignals: PumpSignals = {
    rsiOverheat: calculateRSI(newHistory),
    orderBookThinness: calculateOrderBookThinness(
      normalizedVolatility,
      normalizedAcceleration
    ),
    volumePriceMismatch: calculateVolumePriceMismatch(
      priceChangePct,
      updatedVolumeSignal
    )
  }

  const pumpProbability = combinePumpProbability(pumpSignals)

  const totalRiskNormalized = clamp(
    (normalizedVolatility / 100) * 0.4 +
      updatedVolumeSignal * 0.2 +
      pumpProbability * 0.4
  )

  return {
    ...asset,
    price: newPrice,
    priceHistory: newHistory,
    volatility: normalizedVolatility,
    acceleration: normalizedAcceleration,
    volumeSignal: updatedVolumeSignal,
    pumpSignals,
    pumpProbability,
    riskScore: totalRiskNormalized * 100
  }
}

// --- HOOKS ---

const WALLET_STORAGE_KEY = 'flare_wallet_address'
const INITIAL_WALLET_STATE: WalletState = {
  address: null,
  flrBalance: null,
  isConnected: false,
  isConnecting: true
}

const getInjectedProvider = () => {
  if (typeof window === 'undefined') return null
  const { ethereum } = window as typeof window & { ethereum?: any }
  if (!ethereum) return null

  if (Array.isArray(ethereum.providers) && ethereum.providers.length > 0) {
    const metamaskProvider = ethereum.providers.find((provider: any) => provider.isMetaMask)
    return metamaskProvider ?? ethereum.providers[0]
  }

  return ethereum
}

export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>(INITIAL_WALLET_STATE)
  const [storedAddress, setStoredAddress, isStorageHydrated] = useExtensionStorage<string | null>(WALLET_STORAGE_KEY, null)

  useEffect(() => {
    if (!isStorageHydrated) return
    setWalletState(prev => ({
      ...prev,
      address: storedAddress,
      flrBalance: storedAddress ? prev.flrBalance : null,
      isConnected: storedAddress ? prev.isConnected : false,
      isConnecting: false
    }))
  }, [isStorageHydrated, storedAddress])

  const connectWallet = useCallback(async () => {
    const injectedProvider = getInjectedProvider()
    if (!injectedProvider) {
      alert('MetaMask provider not detected. Please enable the extension and retry from a regular browser tab.')
      return false
    }

    setWalletState(prev => ({ ...prev, isConnecting: true }))

    try {
      const provider = new BrowserProvider(injectedProvider)

      const accounts = await provider.send('eth_requestAccounts', [])
      const address = accounts[0]

      // Ensure we are on Flare (14) or Coston2 (114); otherwise request a switch
      const preferredChains = [14n, 114n]
      const network = await provider.getNetwork()
      console.log('Connected to Chain ID:', network.chainId)
      const currentChainId = BigInt(network.chainId)

      if (!preferredChains.includes(currentChainId)) {
        const targetHexChain =
          currentChainId === 14n ? '0x0e' : currentChainId === 114n ? '0x72' : '0x72' // default to Coston2
        try {
          await injectedProvider.request?.({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetHexChain }]
          })
          const switchedNetwork = await provider.getNetwork()
          console.log('Switched to Chain ID:', switchedNetwork.chainId)
        } catch (switchErr) {
          console.warn('Network switch rejected or failed', switchErr)
        }
      }

      const balance = await provider.getBalance(address)
      console.log('Raw Balance:', balance.toString())
      const flrBalance = parseFloat(formatEther(balance)).toFixed(2)

      setStoredAddress(address)

      setWalletState({
        address,
        flrBalance,
        isConnected: true,
        isConnecting: false
      })

      return true
    } catch (err) {
      console.error(err)
      setWalletState(prev => ({ ...prev, isConnecting: false }))
      return false
    }
  }, [setStoredAddress])

  const disconnectWallet = useCallback(() => {
    setStoredAddress(null)
    setWalletState({
      address: null,
      flrBalance: null,
      isConnected: false,
      isConnecting: false
    })
  }, [setStoredAddress])

  useEffect(() => {
    const injectedProvider = getInjectedProvider()
    if (!injectedProvider?.on) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else {
        const provider = new BrowserProvider(injectedProvider)
        provider.getBalance(accounts[0]).then(balance => {
          console.log('AccountsChanged Raw Balance:', balance.toString())
          const flrBalance = parseFloat(formatEther(balance)).toFixed(2)
          setStoredAddress(accounts[0])
          setWalletState({
            address: accounts[0],
            flrBalance,
            isConnected: true,
            isConnecting: false
          })
        })
      }
    }

    injectedProvider.on('accountsChanged', handleAccountsChanged)
    return () => injectedProvider?.removeListener?.('accountsChanged', handleAccountsChanged)
  }, [disconnectWallet, setStoredAddress])

  return { walletState, connectWallet, disconnectWallet, isHydrated: isStorageHydrated }
}

export function useFTSO(isLiveMode: boolean, timeFrame: TimeFrame) {
  // 1. Initialize strictly empty (No hardcoded values)
  const [assets, setAssets] = useState<Record<string, FTSOAsset>>({})

  const [isConnectedToRPC, setIsConnectedToRPC] = useState(false)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)
  const [hasError, setHasError] = useState(false)

  const livePrices = useLivePrices(INSTITUTIONAL_WHITELIST)

  useEffect(() => {
    if (!isLiveMode) {
      setIsConnectedToRPC(false)
      setIsLoadingPrices(false)
      return
    }

    const symbols = Object.keys(livePrices)

    // Only process if we actually received data
    if (symbols.length > 0) {
      setIsConnectedToRPC(true)
      setHasError(false)
      // Only stop loading if we have assets
      setIsLoadingPrices((prev) => prev && Object.keys(assets).length === 0)

      setAssets(prev => {
        const updated = { ...prev }
        let hasChanges = false

        symbols.forEach(symbol => {
          const liveData = livePrices[symbol]
          if (!liveData) return

          // Case A: Asset doesn't exist yet -> Create it (Live initialization)
          if (!updated[symbol]) {
            const name = ASSET_NAMES[symbol] || symbol
            updated[symbol] = createAsset(symbol, name, liveData.price)
            hasChanges = true
          }
          // Case B: Asset exists -> Update it
          else {
            const currentAsset = updated[symbol]
            if (liveData.price !== currentAsset.price) {
              updated[symbol] = calculateAssetMetrics(currentAsset, liveData.price)
              hasChanges = true
            }
          }
        })

        return hasChanges ? updated : prev
      })
    }
  }, [livePrices, isLiveMode])

  // Simulation Logic (Fallback)
  const updatePricesSimulated = useCallback(
    (crashMultiplier: number = 1, timeFrameNoise: number = 1) => {
      setAssets(prev => {
        const updated = { ...prev }

        // If empty in sim mode, seed it
        if (Object.keys(updated).length === 0) {
          Object.entries(ASSET_NAMES).forEach(([sym, name]) => {
            updated[sym] = createAsset(sym, name, 1000) // Dummy seed
          })
          return updated
        }

        Object.keys(updated).forEach(symbol => {
          const asset = updated[symbol]
          const volatilityFactor =
            crashMultiplier < 1 ? 0.05 : 0.002 * timeFrameNoise
          const change =
            (Math.random() - 0.5) *
            asset.price *
            volatilityFactor *
            crashMultiplier
          const newPrice = Math.max(asset.price + change, asset.price * 0.5)

          updated[symbol] = calculateAssetMetrics(asset, newPrice)
        })

        return updated
      })
    },
    []
  )

  const simulateCrash = useCallback(() => {
    setAssets(prev => {
      const updated = { ...prev }

      Object.keys(updated).forEach(symbol => {
        const asset = updated[symbol]
        const crashPrice = asset.price * 0.9
        const recalculated = calculateAssetMetrics(asset, crashPrice)
        updated[symbol] = {
          ...recalculated,
          riskScore: Math.max(recalculated.riskScore, 90)
        }
      })

      return updated
    })
  }, [])

  const forceRiskScore = useCallback((score: number) => {
    const clamped = Math.min(Math.max(score, 0), 100)

    setAssets(prev => {
      const updated = { ...prev }

      Object.keys(updated).forEach(symbol => {
        const asset = updated[symbol]
        updated[symbol] = {
          ...asset,
          riskScore: clamped,
          volatility: Math.min(clamped * 0.8, 100),
          acceleration: Math.min(clamped * 0.6, 100),
          pumpProbability: clamped / 100,
          volumeSignal: Math.min(clamped / 100, 1)
        }
      })

      return updated
    })
  }, [])

  useEffect(() => {
    if (isLiveMode) return

    const timeFrameNoiseMap: Record<TimeFrame, number> = {
      '5M': 1.5,
      '15M': 1.2,
      '1H': 1.0,
      '4H': 0.8
    }

    const noise = timeFrameNoiseMap[timeFrame]
    const interval = setInterval(
      () => updatePricesSimulated(1, noise),
      2000
    )

    return () => clearInterval(interval)
  }, [isLiveMode, timeFrame, updatePricesSimulated])

  return {
    assets: Object.values(assets),
    simulateCrash,
    forceRiskScore,
    isConnectedToRPC,
    isLoadingPrices: Object.keys(assets).length === 0,
    hasError
  }
}

export function useFAssets(assets: FTSOAsset[]) {
  // Store data for ALL assets, keyed by symbol (e.g., "BTC", "ETH")
  const [fAssetsData, setFAssetsData] = useState<Record<string, FAssetData>>({})
  const assetsRef = useRef<FTSOAsset[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Update the ref whenever assets change (no dependency issues)
  assetsRef.current = assets

  // Initialize data on first load or when asset list changes
  useEffect(() => {
    if (assets.length === 0) return

    // Initial update with current assets
    const updateData = () => {
      setFAssetsData((prev) => {
        const updated = { ...prev }

        assetsRef.current.forEach((asset) => {
          if (!asset.price || asset.price === 0) return

          // Calculate simulated Bridge Data for EACH asset
          const divergenceNoise = (Math.random() - 0.5) * 0.015
          const fAssetPrice = asset.price * (1 + divergenceNoise)
          const divergence = Math.abs((fAssetPrice - asset.price) / asset.price) * 100

          updated[asset.symbol] = {
            nativePrice: asset.price,
            fAssetPrice,
            divergence,
            bridgeRisk: divergence > 1 ? 'High' : 'Low',
          }
        })

        return updated
      })
    }

    // Immediate first update
    updateData()

    // Set up continuous updates every 2 seconds for real-time data
    // Only create interval once - it will use the current assets via ref
    if (!intervalRef.current) {
      intervalRef.current = setInterval(updateData, 2000)
    }

    // Cleanup only on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, []) // Empty dependency array - interval runs once

  return fAssetsData
}

export function useSmartAccount() {
  const [status, setStatus] = useState<SmartAccountStatus>({
    status: 'IDLE',
    lastAction: null,
    timestamp: null
  })

  const execute = useCallback((reason: string) => {
    setStatus({
      status: 'EXECUTED',
      lastAction: `Rebalanced assets to stablecoins - ${reason}`,
      timestamp: Date.now()
    })
  }, [])

  const reset = useCallback(() => {
    setStatus({
      status: 'IDLE',
      lastAction: null,
      timestamp: null
    })
  }, [])

  return { status, execute, reset }
}

export function useFDC() {
  const [verification, setVerification] = useState<FDCVerification>({
    status: 'IDLE',
    requestId: null,
    timestamp: null
  })

  const requestAttestation = useCallback(async () => {
    const requestId = Math.random()
      .toString(36)
      .substring(7)
      .toUpperCase()

    setVerification({
      status: 'REQUESTING',
      requestId,
      timestamp: Date.now()
    })

    return new Promise(resolve => {
      setTimeout(() => {
        setVerification({
          status: 'VERIFIED',
          requestId,
          timestamp: Date.now()
        })
        resolve(true)
      }, 1500)
    })
  }, [])

  const reset = useCallback(() => {
    setVerification({
      status: 'IDLE',
      requestId: null,
      timestamp: null
    })
  }, [])

  return { verification, requestAttestation, reset }
}

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: Date.now(),
      type: 'INFO',
      message: 'FlareGuard system initialized'
    }
  ])

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        type,
        message
      }
    ])
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([
      {
        id: '1',
        timestamp: Date.now(),
        type: 'INFO',
        message: 'FlareGuard system initialized'
      }
    ])
  }, [])

  return { logs, addLog, clearLogs }
}

export function useMarketSafety(
  assets: FTSOAsset[],
  bridgeRisk: 'Low' | 'High'
): number {
  if (assets.length === 0) return 0
  const avgRiskScore =
    assets.reduce((sum, a) => sum + a.riskScore, 0) / assets.length

  const bridgeRiskBonus = bridgeRisk === 'High' ? 15 : 0

  return Math.min(avgRiskScore + bridgeRiskBonus, 100)
}

export function useEmergencyWithdraw() {
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  const withdrawFunds = useCallback(async (userAddress: string | null) => {
    if (!userAddress) return false

    setIsWithdrawing(true)

    return new Promise(resolve => {
      setTimeout(() => {
        setIsWithdrawing(false)
        resolve(true)
      }, 2000)
    })
  }, [])

  return { withdrawFunds, isWithdrawing }
}

export function useWatchlist() {
  const [favorites, setFavorites] = useExtensionStorage<string[]>('flare_watchlist', [])

  const toggleFavorite = useCallback((symbol: string) => {
    setFavorites(prev => {
      const safe = Array.isArray(prev) ? prev : []
      const updated = safe.includes(symbol)
        ? safe.filter(s => s !== symbol)
        : [...safe, symbol]
      return updated
    })
  }, [setFavorites])

  const isFavorite = useCallback(
    (symbol: string) => favorites.includes(symbol),
    [favorites]
  )

  return { favorites, toggleFavorite, isFavorite }
}

export function useAutoProtect() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [lastTopUpTime, setLastTopUpTime] = useState<number | null>(null)

  useEffect(() => {
      const saved = localStorage.getItem('flare_auto_protect')
      setIsEnabled(saved === 'true')
  }, [])

  const toggle = useCallback(enabled => {
    setIsEnabled(enabled)
    localStorage.setItem('flare_auto_protect', enabled.toString())
  }, [])

  const topUpCollateral = useCallback(async () => {
    return new Promise(resolve => {
      setTimeout(() => {
        setLastTopUpTime(Date.now())
        resolve(true)
      }, 1500)
    })
  }, [])

  return { isEnabled, toggle, topUpCollateral, lastTopUpTime }
}

export function useRiskHistory() {
  const [history, setHistory] = useState<
    Array<{ timestamp: number; score: number }>
  >([])

  useEffect(() => {
    const now = Date.now()
    const initialData = Array.from({ length: 50 }, (_, i) => ({
      timestamp: now - (50 - i) * 72000,
      score: Math.random() * 30 + 10
    }))
    setHistory(initialData)
  }, [])

  const addDataPoint = useCallback(score => {
    setHistory(prev =>
      [...prev, { timestamp: Date.now(), score }].slice(-50)
    )
  }, [])

  return { history, addDataPoint }
}

export function useFTSOHeartbeat(isLiveMode: boolean) {
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  const [isPulsing, setIsPulsing] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(Date.now())
      setIsPulsing(true)
      setTimeout(() => setIsPulsing(false), 300)
    }, 2000)

    return () => clearInterval(interval)
  }, [isLiveMode])

  return { lastUpdate, isPulsing }
}

declare global {
  interface Window {
    ethereum?: any
  }
}