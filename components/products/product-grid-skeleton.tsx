import ProductCardSkeleton from "./product-card-skeleton"

interface ProductGridSkeletonProps {
  count?: number
}

/** Drop-in placeholder for a ProductCard grid while its listing request is in flight. */
export default function ProductGridSkeleton({ count = 6 }: ProductGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}
