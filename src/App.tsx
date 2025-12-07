import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { RiskGauge } from '@/components/dashboard/RiskGauge'
import { AssetTable } from '@/components/dashboard/AssetTable'
import { FAssetMonitor } from '@/components/dashboard/FAssetMonitor'
import { SystemLogs } from '@/components/dashboard/SystemLogs'
import { FTSOHeartbeat } from '@/components/dashboard/FTSOHeartbeat'
import { LiquidationShield } from '@/components/dashboard/LiquidationShield'
import { RiskHistoryChart } from '@/components/dashboard/RiskHistoryChart'
import { LiveFeedModal } from '@/components/dashboard/LiveFeedModal'
import { DemoSimulation } from '@/components/dashboard/DemoSimulation'
import { SearchBar } from '@/components/SearchBar'
import { LoadingSkeleton } from '@/components/dashboard/LoadingSkeleton'
import { useLivePrices } from '@/hooks/use-live-prices'
import { useDemoFLRBalanceV2, FLR_CONFIG_V2 } from '@/hooks/use-demo-flr-balance-v2'
import { 
  useFTSO,
  useFAssets, 
  useSmartAccount, 
  useFDC, 
  useLogs, 
  useMarketSafety,
  useWallet,
  useEmergencyWithdraw,
  useWatchlist,
  useAutoProtect,
  useRiskHistory,
  useFTSOHeartbeat
} from '@/hooks/use-flare'
import { TrendDown, ArrowsClockwise, Shield, Wallet, Warning, Circle, Lightning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { TimeFrame, FTSOAsset } from '@/lib/types'

function App() {
  const [isLiveMode, setIsLiveMode] = useState(true)
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1H')
  const [selectedAsset, setSelectedAsset] = useState<FTSOAsset | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  // subscribe to live prices for the key assets we show in feed
  const livePrices = useLivePrices(['BTC', 'ETH', 'XRP'])
  const { balance: demoFlrBalance, collateralVault, stablecoins, autoWithdraw, depositToVault, convertVaultToStable, reclaimCollateral, fundingHistory } = useDemoFLRBalanceV2()
  const { walletState, connectWallet, disconnectWallet } = useWallet()
  const { assets, simulateCrash, forceRiskScore, isConnectedToRPC, isLoadingPrices, hasError } = useFTSO(isLiveMode, timeFrame)
  const btcAsset = assets.find(a => a.symbol === 'BTC')
  const fAssetData = useFAssets(assets)
  const { status: smartAccountStatus, execute: executeSmartAccount, reset: resetSmartAccount } = useSmartAccount()
  const { verification: fdcVerification, requestAttestation, reset: resetFDC } = useFDC()
  const { logs, addLog, clearLogs } = useLogs()
  const marketSafetyScore = useMarketSafety(assets, fAssetData.BTC?.bridgeRisk || 'Low')
  const { withdrawFunds, isWithdrawing } = useEmergencyWithdraw()
  const { favorites, toggleFavorite } = useWatchlist()
  const { isEnabled: isAutoProtectEnabled, toggle: toggleAutoProtect, topUpCollateral, lastTopUpTime } = useAutoProtect()
  const { history: riskHistory, addDataPoint } = useRiskHistory()
  const { lastUpdate, isPulsing } = useFTSOHeartbeat(isLiveMode)

  const prevMarketScoreRef = useRef(marketSafetyScore)
  const prevBridgeRiskRef = useRef(fAssetData.bridgeRisk)
  const executionInProgressRef = useRef(false)
  const autoProtectTriggeredRef = useRef(false)
  const demoFundsDepletedRef = useRef(false)
  const hasProcessedExecutionRef = useRef(false)

  const getSafeAmount = (value: number) => Math.max(0, Math.floor(value * 100) / 100)

  useEffect(() => {
    const shouldTrigger = 
      (marketSafetyScore > 75 || fAssetData.bridgeRisk === 'High') && 
      smartAccountStatus.status === 'IDLE' &&
      !executionInProgressRef.current &&
      !isLiveMode

    if (shouldTrigger) {
      executionInProgressRef.current = true
      
      const reason = marketSafetyScore > 75 
        ? `Market Risk Score exceeded threshold (${Math.round(marketSafetyScore)})`
        : 'Bridge risk detected (BTC/FBTC divergence > 1%)'

      addLog('WARNING', `Risk threshold breached: ${reason}`)
      addLog('INFO', 'Initiating FDC attestation request...')

      requestAttestation().then((verified) => {
        if (verified) {
          addLog('SUCCESS', `FDC Proof verified - Request ID: ${fdcVerification.requestId}`)
          addLog('INFO', 'Executing Smart Account protection protocol...')
          
          setTimeout(() => {
            executeSmartAccount(reason)
            addLog('SUCCESS', 'Smart Account automatically rebalanced assets to stablecoins')
            executionInProgressRef.current = false
          }, 300)
        }
      })
    }
  }, [marketSafetyScore, fAssetData.bridgeRisk, smartAccountStatus.status, addLog, requestAttestation, executeSmartAccount, fdcVerification.requestId, isLiveMode])

  useEffect(() => {
    if (marketSafetyScore !== prevMarketScoreRef.current) {
      if (marketSafetyScore > 75 && prevMarketScoreRef.current <= 75) {
        addLog('WARNING', `Market Safety Score critical: ${Math.round(marketSafetyScore)}`)
      }
      prevMarketScoreRef.current = marketSafetyScore
    }
  }, [marketSafetyScore, addLog])

  useEffect(() => {
    if (fAssetData.bridgeRisk !== prevBridgeRiskRef.current) {
      if (fAssetData.bridgeRisk === 'High') {
        addLog('WARNING', `Bridge risk detected: BTC/FBTC divergence at ${fAssetData.divergence.toFixed(3)}%`)
      }
      prevBridgeRiskRef.current = fAssetData.bridgeRisk
    }
  }, [fAssetData.bridgeRisk, fAssetData.divergence, addLog])

  // Auto-fund FLR when risk exceeds threshold
  useEffect(() => {
    if (marketSafetyScore > FLR_CONFIG_V2.RISK_THRESHOLD) {
      const recentCollateralization = [...fundingHistory]
        .reverse()
        .find(entry => entry.reason.includes('Collateral top-up') || entry.reason.includes('Market crash collateralization'))

      const withinCooldown = recentCollateralization && Date.now() - recentCollateralization.timestamp < 5000

      if (!withinCooldown) {
        const normalizedBalance = getSafeAmount(demoFlrBalance)
        const autoCollateralAmount = Math.min(FLR_CONFIG_V2.AUTO_FUND_AMOUNT, normalizedBalance)

        if (autoCollateralAmount > 0) {
          const moved = depositToVault(autoCollateralAmount, 'Auto collateral top-up (risk > threshold)')
          if (moved) {
            addLog('SUCCESS', `Auto collateral top-up executed: ${autoCollateralAmount.toFixed(2)} FLR secured`)
            toast.info(`Auto collateral top-up: ${autoCollateralAmount.toFixed(2)} FLR moved to vault`)
            demoFundsDepletedRef.current = false
          }
        } else if (!demoFundsDepletedRef.current) {
          addLog('WARNING', 'Demo FLR reserves depleted — auto collateralization paused')
          toast.warning('Demo FLR reserves depleted. Auto-collateralization paused until you replenish the demo balance.')
          demoFundsDepletedRef.current = true
        }
      }
    }

    // Auto-withdraw for protection when executing smart account
    if (smartAccountStatus.status === 'EXECUTED') {
      if (!hasProcessedExecutionRef.current) {
        hasProcessedExecutionRef.current = true

        const withdrew = autoWithdraw('Collateral used for protection rebalance')
        if (withdrew) {
          addLog('INFO', `💸 Withdrew ${FLR_CONFIG_V2.WITHDRAWAL_AMOUNT} FLR for protection mechanism`)

          const convertAmount = FLR_CONFIG_V2.WITHDRAWAL_AMOUNT / 2
          setTimeout(() => {
            const converted = convertVaultToStable(convertAmount)
            if (converted) {
              addLog('INFO', `Converted ${convertAmount} FLR to institutional stablecoins buffer`)
            } else {
              addLog('WARNING', 'Collateral conversion skipped — insufficient vault balance detected')
            }
          }, 0)
          demoFundsDepletedRef.current = false
        } else {
          addLog('WARNING', `Attempted to withdraw ${FLR_CONFIG_V2.WITHDRAWAL_AMOUNT} FLR for protection but insufficient demo balance`)
          if (!demoFundsDepletedRef.current) {
            toast.warning('Demo FLR reserves are exhausted. Auto-protection actions are paused until funds are replenished.')
            demoFundsDepletedRef.current = true
          }
        }
      }
    } else {
      hasProcessedExecutionRef.current = false
    }
  }, [marketSafetyScore, smartAccountStatus.status, fundingHistory, autoWithdraw, addLog, demoFlrBalance, depositToVault, convertVaultToStable])

  useEffect(() => {
    if (isLiveMode && isConnectedToRPC) {
      addLog('SUCCESS', 'Connected to Flare Network RPC')
      addLog('INFO', 'Fetching live FTSO prices...')
    } else if (isLiveMode && hasError) {
      addLog('ERROR', 'Server is down - Failed to connect to Flare RPC')
    } else if (isLiveMode && !isConnectedToRPC && !hasError) {
      addLog('WARNING', 'Attempting to connect to Flare RPC...')
    } else {
      addLog('INFO', 'Demo mode activated - using simulated data')
    }
  }, [isLiveMode, isConnectedToRPC, hasError, addLog])

  useEffect(() => {
    addDataPoint(marketSafetyScore)
  }, [marketSafetyScore, addDataPoint])

  useEffect(() => {
    if (isAutoProtectEnabled && marketSafetyScore > 85 && !autoProtectTriggeredRef.current) {
      autoProtectTriggeredRef.current = true
      
      addLog('WARNING', `Risk Score critical: ${Math.round(marketSafetyScore)} - Activating Liquidation Shield`)
      
      topUpCollateral().then(() => {
        toast.warning('⚠️ Market Crash Detected! Smart Account Auto-Deposited 500 FLR to Prevent Liquidation.', {
          duration: 5000
        })
        addLog('SUCCESS', 'Liquidation Shield activated: 500 FLR deposited to collateral vault')
        
        setTimeout(() => {
          autoProtectTriggeredRef.current = false
        }, 30000)
      })
    }
  }, [isAutoProtectEnabled, marketSafetyScore, topUpCollateral, addLog])

  useEffect(() => {
    const savedAddress = localStorage.getItem('flare_wallet_address')
    if (savedAddress && window.ethereum && !walletState.isConnected) {
      connectWallet()
    }
  }, [connectWallet, walletState.isConnected])


  const handleSimulateCrash = () => {
    if (isLiveMode) {
      toast.error('Crash simulation only available in Demo Mode')
      return
    }
    addLog('INFO', 'Manual market crash simulation initiated')

    const normalizedBalance = getSafeAmount(demoFlrBalance)
    const crashCollateralAmount = Math.min(FLR_CONFIG_V2.WITHDRAWAL_AMOUNT, normalizedBalance)

    if (crashCollateralAmount > 0) {
      const moved = depositToVault(crashCollateralAmount, 'Market crash collateralization')
      if (moved) {
        addLog('WARNING', `Market crash: ${crashCollateralAmount.toFixed(2)} FLR moved to collateral vault`)
        toast.warning(`Collateral vault increased by ${crashCollateralAmount.toFixed(2)} FLR for crash protection`)
        demoFundsDepletedRef.current = false
      }
    } else if (!demoFundsDepletedRef.current) {
      addLog('WARNING', 'Demo FLR reserves depleted — unable to collateralize crash event')
      toast.warning('Demo FLR reserves depleted. No funds moved to collateral.')
      demoFundsDepletedRef.current = true
    }

    simulateCrash()
    toast.info('Market crash simulated!')
  }

  const handleForceRisk = () => {
    if (isLiveMode) {
      toast.error('Force risk only available in Demo Mode')
      return
    }
    forceRiskScore(95)
    addLog('WARNING', 'Risk score manually set to 95 (CRITICAL)')
    toast.warning('Risk score forced to 95!')
  }

  const handleReclaimCollateral = () => {
    if (collateralVault <= 0) {
      toast.info('No collateral available to reclaim')
      return
    }

    const reclaimAmount = getSafeAmount(collateralVault)
    const reclaimed = reclaimCollateral(undefined, 'Manual collateral reclaim')

    if (reclaimed) {
      addLog('SUCCESS', `Collateral reclaimed: ${reclaimAmount.toFixed(2)} FLR returned to demo reserves`)
      toast.success(`Collateral reclaimed: +${reclaimAmount.toFixed(2)} FLR to demo balance`)
      demoFundsDepletedRef.current = false
    } else {
      toast.error('Failed to reclaim collateral')
      addLog('ERROR', 'Collateral reclaim attempt failed')
    }
  }

  const handleReset = () => {
    resetSmartAccount()
    resetFDC()
    clearLogs()
    executionInProgressRef.current = false
    autoProtectTriggeredRef.current = false
    addLog('INFO', 'System reset complete')
    toast.success('System reset')
  }

  const handleConnectWallet = async () => {
    const success = await connectWallet()
    if (success) {
      toast.success('Wallet connected successfully')
      addLog('SUCCESS', `Wallet connected: ${walletState.address?.substring(0, 6)}...${walletState.address?.substring(38)}`)
    } else {
      toast.error('Failed to connect wallet')
      addLog('ERROR', 'Wallet connection failed')
    }
  }

  const handleDisconnectWallet = () => {
    disconnectWallet()
    toast.info('Wallet disconnected')
    addLog('INFO', 'Wallet disconnected')
  }

  const handleModeToggle = (checked: boolean) => {
    setIsLiveMode(checked)
    if (checked) {
      addLog('INFO', 'Switching to Live Mode - attempting Flare Network connection...')
      toast.info('Switching to Live Mode')
    } else {
      addLog('INFO', 'Switching to Demo Mode - simulation enabled')
      toast.info('Switching to Demo Mode')
    }
  }

  const handleEmergencyWithdraw = async () => {
    if (!walletState.isConnected) {
      toast.error('Please connect wallet first')
      return
    }

    addLog('WARNING', 'Emergency withdrawal initiated')
    const success = await withdrawFunds(walletState.address)
    
      if (success) {
      toast.success('🎉 Funds Secured! All assets withdrawn to your wallet.')
      addLog('SUCCESS', `Emergency withdrawal completed - Vault.withdrawAll(${walletState.address?.substring(0, 6)}...${walletState.address?.substring(38)})`)
      // Reflect demo FLR withdrawal in demo balance for visibility
      const withdrew = autoWithdraw('Manual emergency withdrawal')
      if (withdrew) {
        addLog('INFO', 'Demo FLR balance updated to reflect withdrawal')
      } else {
        addLog('WARNING', 'Demo FLR withdrawal skipped — insufficient demo balance')
      }
    } else {
      toast.error('Withdrawal failed')
      addLog('ERROR', 'Emergency withdrawal failed')
    }
  }

  const isEmergencyVisible = marketSafetyScore > 75

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(38)}`
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" weight="fill" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">FlareGuard</h1>
              <p className="text-sm text-muted-foreground">Institutional-Grade Risk Monitor • Blue-Chip Assets Only • FTSO V2 • Smart Accounts • FDC</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {hasError && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/20 border border-destructive text-destructive text-sm font-medium animate-pulse">
                <Warning className="w-4 h-4" weight="fill" />
                Network Error - Retrying...
              </div>
            )}
            
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-secondary border border-border">
              <Circle 
                className={`w-4 h-4 ${isLiveMode && isConnectedToRPC ? 'text-primary pulse-glow' : 'text-muted-foreground'}`} 
                weight="fill"
              />
              <Label htmlFor="mode-toggle" className="text-sm font-medium cursor-pointer">
                {isLoadingPrices && isLiveMode ? 'Loading Prices...' : isLiveMode ? 'Live Network' : 'Demo Simulation'}
              </Label>
              <Switch 
                id="mode-toggle" 
                checked={isLiveMode} 
                onCheckedChange={handleModeToggle}
              />
            </div>

            {walletState.isConnected ? (
              <div className="flex items-center gap-2">
                <Card className="px-4 py-2 bg-card border-border">
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">FLR Balance</div>
                      <div className="font-mono text-sm font-bold text-primary">{walletState.flrBalance}</div>
                    </div>
                    <Separator orientation="vertical" className="h-8 bg-border" />
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Wallet</div>
                      <div className="font-mono text-sm font-bold">{formatAddress(walletState.address!)}</div>
                    </div>
                  </div>
                </Card>
                {/* Demo balance shown even when wallet connected for visibility */}
                <Card className="px-3 py-2 bg-secondary border-border ml-2">
                  <div className="text-xs text-muted-foreground">Demo FLR</div>
                  <div className="font-mono text-sm font-bold text-accent">{demoFlrBalance.toFixed(2)}</div>
                </Card>
                <Card className="px-3 py-2 bg-secondary border-border ml-2">
                  <div className="text-xs text-muted-foreground">Collateral Vault</div>
                  <div className="font-mono text-sm font-bold">{collateralVault.toFixed(2)} FLR</div>
                  <div className="text-xs text-muted-foreground mt-1">Stablecoins</div>
                  <div className="font-mono text-sm font-bold">{stablecoins.toFixed(2)}</div>
                </Card>
                <Button 
                  onClick={handleDisconnectWallet}
                  variant="outline"
                  size="sm"
                  className="border-border"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Card className="px-4 py-2 bg-card border-border/50 border-dashed">
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Demo FLR Balance</div>
                      <div className="font-mono text-sm font-bold text-accent">{demoFlrBalance.toFixed(2)}</div>
                    </div>
                    <Separator orientation="vertical" className="h-8 bg-border/50" />
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Collateral Vault</div>
                      <div className="font-mono text-sm font-bold">{collateralVault.toFixed(2)} FLR</div>
                      <div className="text-xs text-muted-foreground mt-1">Stablecoins</div>
                      <div className="font-mono text-sm font-bold">{stablecoins.toFixed(2)}</div>
                    </div>
                    <Separator orientation="vertical" className="h-8 bg-border/50" />
                    <div className="text-right text-xs">
                      <div className="text-muted-foreground">Mode</div>
                      <div className="font-mono font-bold text-yellow-500">Demo Account</div>
                    </div>
                  </div>
                </Card>
                <Button 
                  onClick={handleConnectWallet}
                  disabled={walletState.isConnecting}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Wallet className="w-4 h-4 mr-2" weight="fill" />
                  {walletState.isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </div>
            )}
          </div>
        </header>

        <Separator className="bg-border" />

        {isLoadingPrices && assets.length === 0 ? (
          <LoadingSkeleton />
        ) : (
          <>
            <SearchBar
              onAssetSelect={(symbol) => {
                addLog('INFO', `Blue-chip asset selected: ${symbol}`)
                toast.success(`✓ ${symbol} added to monitoring`)
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FTSOHeartbeat 
                lastUpdate={lastUpdate}
                isPulsing={isPulsing}
                isLiveMode={isLiveMode}
              />
              <LiquidationShield 
                isEnabled={isAutoProtectEnabled}
                onToggle={toggleAutoProtect}
                lastTopUpTime={lastTopUpTime}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-6 bg-card border-border flex flex-col items-center justify-center">
                <h2 className="text-sm font-semibold text-muted-foreground mb-4 tracking-wider uppercase">Global Market Safety</h2>
                <RiskGauge score={marketSafetyScore} />
              </Card>

              <div className="lg:col-span-2">
                <AssetTable 
                  assets={assets} 
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  onAssetClick={(asset) => {
                    setSelectedAsset(asset)
                    setIsModalOpen(true)
                  }}
                  livePrices={livePrices}
                  isLoading={isLoadingPrices && isLiveMode}
                  hasError={hasError && isLiveMode}
                />
              </div>
            </div>

            <RiskHistoryChart data={riskHistory} />

            <DemoSimulation />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FAssetMonitor assets={assets} />
              <SystemLogs 
                logs={logs}
                smartAccountStatus={smartAccountStatus}
                fdcVerification={fdcVerification}
              />
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button 
                onClick={handleReset}
                variant="outline"
                className="border-border hover:bg-secondary"
              >
                <ArrowsClockwise className="w-4 h-4 mr-2" />
                Reset System
              </Button>

              <Button
                onClick={handleReclaimCollateral}
                variant="outline"
                disabled={collateralVault <= 0}
                className="border-border hover:bg-secondary disabled:opacity-60"
              >
                <Shield className="w-4 h-4 mr-2" weight="fill" />
                Reclaim Collateral
              </Button>

              {!isLiveMode && (
                <>
                  <Button 
                    onClick={handleSimulateCrash}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20"
                  >
                    <TrendDown className="w-4 h-4 mr-2" />
                    Simulate Market Crash
                  </Button>

                  <Button 
                    onClick={handleForceRisk}
                    variant="outline"
                    className="border-[oklch(0.70_0.20_60)] text-[oklch(0.70_0.20_60)] hover:bg-[oklch(0.70_0.20_60)] hover:text-primary-foreground"
                  >
                    <Warning className="w-4 h-4 mr-2" weight="fill" />
                    Force Risk to 95
                  </Button>
                </>
              )}

              {isEmergencyVisible && (
                <Button
                  onClick={handleEmergencyWithdraw}
                  disabled={isWithdrawing || !walletState.isConnected}
                  className="
                    relative
                    bg-destructive 
                    text-destructive-foreground 
                    hover:bg-destructive/90 
                    border-2 
                    border-destructive
                    shadow-[0_0_20px_rgba(232,150,90,0.6)]
                    animate-pulse
                    font-bold
                    px-8
                  "
                  style={{
                    animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  }}
                >
                  <Lightning className="w-5 h-5 mr-2" weight="fill" />
                  {isWithdrawing ? 'WITHDRAWING...' : 'EMERGENCY WITHDRAW'}
                </Button>
              )}
            </div>

            <footer className="text-center text-xs text-muted-foreground pt-4">
              <p>Powered by Flare Network • FTSO V2 • FAssets • FDC • Smart Accounts</p>
              <p className="mt-1 opacity-70">
                {isLiveMode 
                  ? (hasError 
                      ? '🔴 Error: Server is Down' 
                      : (isConnectedToRPC ? '🟢 Live: Flare Coston2 Testnet' : '🟡 Connecting...')) 
                  : '🔵 Demo Mode Active'}
              </p>
            </footer>
          </>
        )}

      </div>

      <LiveFeedModal 
        asset={selectedAsset}
        isOpen={isModalOpen}
        livePrices={livePrices}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedAsset(null)
        }}
      />
    </div>
  )
}

export default App
