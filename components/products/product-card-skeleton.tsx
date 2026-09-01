import { Skeleton } from "@/components/ui/skeleton"

/** Mirrors ProductCard's layout so the loading state doesn't reflow into the real grid. */
export default function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col">
      <Skeleton className="h-48 w-full rounded-none" />

      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-14 flex-shrink-0" />
        </div>

        <Skeleton className="h-3 w-1/4 mb-3" />

        <div className="space-y-1.5 mb-3">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>

        <div className="mt-auto pt-2">
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>
    </div>
  )
}
