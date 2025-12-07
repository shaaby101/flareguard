import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RiskGauge } from '@/components/dashboard/RiskGauge'
import { useFTSO, useFAssets, useMarketSafety, useWatchlist } from '@/hooks/use-flare'
import type { FTSOAsset, TimeFrame } from '@/lib/types'
import { Star, TrendUp, TrendDown } from '@phosphor-icons/react'

const DEFAULT_TIMEFRAME: TimeFrame = '1H'
const CRITICAL_ASSETS = ['BTC', 'ETH', 'FLR']

type ChromeLike = {
  runtime?: { getURL(path: string): string }
  tabs?: { create(details: { url: string }): void }
}

export function PopupHUD() {
  const { assets, isLoadingPrices, hasError } = useFTSO(true, DEFAULT_TIMEFRAME)
  const fAssets = useFAssets(assets)
  const bridgeRisk = fAssets.BTC?.bridgeRisk ?? 'Low'
  const marketSafetyScore = useMarketSafety(assets, bridgeRisk)
  const { favorites, toggleFavorite } = useWatchlist()
  const chromeLike =
    typeof window !== 'undefined'
      ? (window as Window & { chrome?: ChromeLike }).chrome
      : undefined

  const prioritizedAssets = useMemo(() => {
    if (!assets || assets.length === 0) return []

    const critical = assets.filter(asset => CRITICAL_ASSETS.includes(asset.symbol))
    const starred = assets.filter(asset => favorites.includes(asset.symbol))
    const combined = [...critical, ...starred]

    if (combined.length === 0) return assets.slice(0, 3)

    const unique = combined.filter(
      (asset, index, self) => self.findIndex(a => a.symbol === asset.symbol) === index
    )

    return unique.slice(0, 3)
  }, [assets, favorites])

  const handleOpenDashboard = () => {
    if (chromeLike?.tabs?.create) {
      const url = chromeLike.runtime?.getURL('index.html') ?? 'index.html'
      chromeLike.tabs.create({ url })
    } else {
      window.open('/', '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="w-[380px] min-h-[560px] bg-background text-foreground p-4 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">FlareGuard</p>
          <h1 className="text-lg font-semibold -mt-1">Security HUD</h1>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase text-muted-foreground tracking-[0.3em]">Status</span>
          <span className="text-xs font-mono text-primary">LIVE</span>
        </div>
      </header>

      <Card className="bg-card border-border p-4">
        <div className="text-xs uppercase tracking-[0.35em] text-muted-foreground mb-3">
          Global Risk
        </div>
        <div className="scale-75 origin-top">
          <RiskGauge score={marketSafetyScore} />
        </div>
      </Card>

      <Card className="bg-card border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Liquidation Shield
            </p>
            <p className="text-sm text-muted-foreground">Auto-withdraw if score spikes</p>
          </div>
          <div className="text-xs font-semibold text-primary">ENABLED</div>
        </div>
      </Card>

      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <div className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          Critical Assets
        </div>
        <div className="flex-1 overflow-auto space-y-3 pr-1">
          {hasError && (
            <Card className="p-3 text-xs text-destructive bg-destructive/10 border-destructive/30">
              Unable to reach FTSO feeds. Check RPC connection.
            </Card>
          )}
          {isLoadingPrices && !hasError && (
            <Card className="p-3 text-xs text-muted-foreground bg-card border-dashed border-border">
              Syncing live feeds…
            </Card>
          )}
          {!isLoadingPrices &&
            prioritizedAssets.map(asset => (
              <AssetCompactCard
                key={asset.symbol}
                asset={asset}
                isFavorite={favorites.includes(asset.symbol)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
        </div>
      </div>

      <Button onClick={handleOpenDashboard} className="w-full">
        Open Full Dashboard ↗
      </Button>
    </div>
  )
}

interface AssetCompactCardProps {
  asset: FTSOAsset
  isFavorite: boolean
  onToggleFavorite: (symbol: string) => void
}

function AssetCompactCard({ asset, isFavorite, onToggleFavorite }: AssetCompactCardProps) {
  const latestPrice = asset.price
  const prevPrice =
    asset.priceHistory.length > 1
      ? asset.priceHistory[asset.priceHistory.length - 2]
      : asset.priceHistory[asset.priceHistory.length - 1]
  const priceChange =
    prevPrice && prevPrice !== 0 ? ((latestPrice - prevPrice) / prevPrice) * 100 : 0
  const isPositive = priceChange >= 0
  const priceColor = isPositive ? 'text-primary' : 'text-destructive'

  const formatPrice = () => {
    if (asset.symbol === 'XRP') return `$${latestPrice.toFixed(4)}`
    if (asset.symbol === 'ETH') return `$${latestPrice.toFixed(2)}`
    return `$${latestPrice.toFixed(0)}`
  }

  return (
    <Card className="grid grid-cols-2 gap-y-1 p-3 bg-card/50 rounded-lg border border-border/50 items-center overflow-hidden">
      <div className="flex items-center gap-1 truncate">
        <button
          onClick={() => onToggleFavorite(asset.symbol)}
          className={`p-1 rounded-full transition-colors ${isFavorite ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          aria-label="Toggle favorite asset"
        >
          <Star className="w-3.5 h-3.5" weight={isFavorite ? 'fill' : 'regular'} />
        </button>
        <span className="font-bold text-sm font-mono truncate">{asset.symbol}</span>
      </div>
      <div className={`text-right font-mono text-sm ${priceColor} truncate`}>
        {formatPrice()} <span className="text-[10px]">{Math.abs(priceChange).toFixed(1)}%</span>
      </div>
      <div className="text-[10px] text-muted-foreground truncate">
        Vol: {asset.volatility.toFixed(1)}%
      </div>
      <div className="text-[10px] text-muted-foreground text-right truncate">
        Acc: {asset.acceleration.toFixed(1)}%
      </div>
    </Card>
  )
}
