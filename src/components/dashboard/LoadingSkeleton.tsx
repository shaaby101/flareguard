import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Reconstructed Top Section: Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="p-6 bg-card border-border">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full" />
          </Card>
        ))}
      </div>

      {/* Middle Section: Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie/Donut Chart Skeleton */}
        <Card className="p-6 bg-card border-border flex flex-col items-center justify-center">
          <Skeleton className="h-4 w-32 mb-6" />
          <Skeleton className="h-48 w-48 rounded-full" />
        </Card>

        {/* List/Table Skeleton */}
        <Card className="lg:col-span-2 p-6 bg-card border-border">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-20" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Section: Additional Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-32 w-full" />
          </div>
        </Card>
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-32 w-full" />
          </div>
        </Card>
      </div>
    </div>
  )
}