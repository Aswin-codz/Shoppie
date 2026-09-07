import ProductCard from './ProductCard';
import { PackageOpen } from 'lucide-react';

export default function ProductGrid({ products, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 min-[520px]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[360px] animate-pulse">
            <div className="w-full h-48 bg-slate-200"></div>
            <div className="p-4 flex flex-col gap-3">
              <div className="w-1/3 h-3 bg-slate-200 rounded"></div>
              <div className="w-full h-4 bg-slate-200 rounded"></div>
              <div className="w-1/4 h-3 bg-slate-200 rounded mt-2"></div>
              <div className="flex justify-between items-center mt-auto">
                <div className="w-1/4 h-5 bg-slate-200 rounded"></div>
                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-xl border border-slate-200 border-dashed">
        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <PackageOpen className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">No products found</h3>
        <p className="text-slate-500 max-w-sm">
          We couldn't find any products matching your current filters and search criteria. Try adjusting them.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 min-[520px]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
