import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { FTSOAsset } from '@/lib/types'
import { TrendUp, TrendDown, Star, WarningCircle } from '@phosphor-icons/react'

interface AssetTableProps {
  assets: FTSOAsset[]
  favorites: string[]
  onToggleFavorite: (symbol: string) => void
  onAssetClick?: (asset: FTSOAsset) => void
  livePrices?: Record<string, { price: number; timestamp: number }>
  isLoading?: boolean
  hasError?: boolean
}

export function AssetTable({ assets, favorites, onToggleFavorite, onAssetClick, livePrices = {}, isLoading = false, hasError = false }: AssetTableProps) {
  const getRiskBadgeColor = (score: number) => {
    if (score < 40) return 'bg-[oklch(0.75_0.25_145)] text-[oklch(0.05_0.01_250)]'
    if (score < 75) return 'bg-[oklch(0.70_0.20_60)] text-[oklch(0.05_0.01_250)]'
    return 'bg-[oklch(0.65_0.30_25)] text-white'
  }

  const getRiskLabel = (score: number) => {
    if (score < 40) return 'SAFE'
    if (score < 75) return 'WARNING'
    return 'DANGER'
  }

  const formatPrice = (symbol: string, price: number) => {
    if (symbol === 'XRP') return price.toFixed(4)
    if (symbol === 'ETH') return price.toFixed(2)
    return price.toFixed(0)
  }

  const getPriceChange = (asset: FTSOAsset) => {
    if (asset.priceHistory.length < 2) return 0
    const current = asset.priceHistory[asset.priceHistory.length - 1]
    const previous = asset.priceHistory[asset.priceHistory.length - 2]
    return ((current - previous) / previous) * 100
  }

  const sortedAssets = [...assets].sort((a, b) => {
    const aIsFav = favorites.includes(a.symbol)
    const bIsFav = favorites.includes(b.symbol)
    if (aIsFav && !bIsFav) return -1
    if (!aIsFav && bIsFav) return 1
    return 0
  })

  if (hasError) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-accent" weight="fill" />
          <h3 className="text-lg font-semibold">FTSO Live Feed</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <WarningCircle className="w-16 h-16 text-destructive" weight="fill" />
          <h3 className="text-xl font-bold text-destructive">Server is Down</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Unable to connect to Flare Network RPC. Please check your connection and try again.
          </p>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-accent" weight="fill" />
          <h3 className="text-lg font-semibold">FTSO Live Feed</h3>
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 rounded-lg bg-secondary border border-border"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-md" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-accent" weight="fill" />
        <h3 className="text-lg font-semibold">FTSO Live Feed</h3>
        {favorites.length > 0 && (
          <Badge variant="outline" className="ml-2 text-xs">
            {favorites.length} Starred
          </Badge>
        )}
      </div>
      <div className="space-y-3">
        {sortedAssets.map((asset) => {
          // If livePrices available, compute change against last historical point
          const live = livePrices?.[asset.symbol]
          const currentPrice = live ? live.price : asset.price
          const priceChange = live
            ? asset.priceHistory.length > 0
              ? ((currentPrice - asset.priceHistory[asset.priceHistory.length - 1]) / asset.priceHistory[asset.priceHistory.length - 1]) * 100
              : 0
            : getPriceChange(asset)
          const isPositive = priceChange >= 0
          const isFavorite = favorites.includes(asset.symbol)

          return (
            <div
              key={asset.symbol}
              onClick={() => onAssetClick?.(asset)}
              className={`
                flex items-center justify-between p-4 rounded-lg bg-secondary border 
                ${isFavorite ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border'}
                hover:border-accent/50 transition-all cursor-pointer hover:shadow-md hover:shadow-accent/20
              `}
            >
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(asset.symbol) }}
                  className={`p-2 ${isFavorite ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <Star className="w-5 h-5" weight={isFavorite ? 'fill' : 'regular'} />
                </Button>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-foreground">
                      {asset.symbol}
                    </span>
                    <span className="text-sm text-muted-foreground">{asset.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-2xl font-bold text-accent">
                      ${formatPrice(asset.symbol, currentPrice)}
                    </span>
                    <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-primary' : 'text-destructive'}`}>
                      {isPositive ? (
                        <TrendUp className="w-4 h-4" />
                      ) : (
                        <TrendDown className="w-4 h-4" />
                      )}
                      <span className="font-mono">{Math.abs(priceChange).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">Volatility</div>
                  <div className="font-mono text-sm text-foreground">
                    {asset.volatility.toFixed(1)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">Acceleration</div>
                  <div className="font-mono text-sm text-foreground">
                    {asset.acceleration.toFixed(1)}%
                  </div>
                </div>
                <div className="text-right min-w-[100px]">
                  <div className="text-xs text-muted-foreground mb-1">Risk Score</div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-mono text-lg font-bold">
                      {Math.round(asset.riskScore)}
                    </span>
                    <Badge className={getRiskBadgeColor(asset.riskScore)}>
                      {getRiskLabel(asset.riskScore)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
