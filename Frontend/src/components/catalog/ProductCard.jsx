import { Link, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { addCartItem } from '../../features/cart/cartSlice';
import { toggleWishlist } from '../../features/wishlist/wishlistSlice';
import { toast } from 'react-hot-toast';

export default function ProductCard({ product, intelligence }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: wishlistItems } = useSelector(state => state.wishlist);
  const { user } = useSelector(state => state.auth);
  
  const isOutOfStock = product.stock_quantity <= 0;
  const isWishlisted = wishlistItems.some(i => i.product.id === product.id);
  const isOwnProduct = Boolean(user && product && user.id === product.merchant_id);
  const isOnSale = product.compare_at_price && Number(product.compare_at_price) > Number(product.price);
  
  // Consider product "New" if created within the last 14 days
  const isNew = (() => {
    if (!product.created_at) return false;
    const createdDate = new Date(product.created_at);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    return createdDate >= fourteenDaysAgo;
  })();

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (isOwnProduct) {
      toast.error("You cannot purchase your own product.");
      return;
    }
    if (!isOutOfStock) {
      dispatch(addCartItem({ product, quantity: 1 }));
      toast.success(`Added ${product.name} to cart`);
    }
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    dispatch(toggleWishlist(product));
    if (isWishlisted) {
      toast.success(`${product.name} removed from wishlist`);
    } else {
      toast.success(`${product.name} added to wishlist`);
    }
  };

  const displayImage = product.primary_image || 
                       product.images?.find(i => i.is_primary)?.image_url || 
                       product.images?.[0]?.image_url || 
                       product.images?.[0]?.image;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.08)] transition-all duration-200 group flex flex-col h-full relative overflow-hidden"
    >
      {/* Intelligence Badges */}
      {intelligence && intelligence.price_dropped && (
        <div className="absolute top-2 right-12 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md z-20 animate-pulse">
          Price dropped by ₹{Number(intelligence.drop_amount).toFixed(2)}!
        </div>
      )}
      
      {/* Product Image Section */}
      <Link to={`/products/${product.slug}`} className="block relative aspect-square overflow-hidden bg-slate-50/80 px-8 py-6 flex items-center justify-center border-b border-slate-100">
        {displayImage ? (
          <img 
            src={displayImage} 
            alt={product.name} 
            className="max-w-[100%] max-h-[100%] w-auto h-auto object-contain object-center group-hover:scale-103 transition-transform duration-300 rounded-2xl "
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
            No Image
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          {intelligence && intelligence.in_stock && (
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              Back in Stock!
            </span>
          )}
          {product.is_featured && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              Featured
            </span>
          )}
          {isNew && !product.is_featured && (
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              New
            </span>
          )}
          {isOnSale && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              Sale
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              Out of Stock
            </span>
          )}
        </div>
        
        <button
          onClick={handleToggleWishlist}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors z-10 border border-slate-100"
          aria-label="Wishlist"
        >
          <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>
      </Link>
      
      {/* Product Info Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow">
        {/* Category & Rating */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <Link to={`/?category=${product.category_slug}`} className="text-xs font-semibold text-indigo-600 uppercase tracking-wider hover:underline truncate">
            {product.category}
          </Link>
          <div className="flex items-center text-amber-400 text-xs font-semibold flex-shrink-0">
            <Star className="h-3.5 w-3.5 fill-current mr-1" />
            <span className="text-slate-700">{Number(product.rating || 0).toFixed(1)}</span>
          </div>
        </div>

        {/* Product Title */}
        <Link to={`/products/${product.slug}`} className="block mb-3 flex-grow">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        
        {/* Price Row (Dedicated Line) */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            {isOnSale && (
              <span className="text-xs text-slate-400 line-through">
                ₹{Number(product.compare_at_price).toFixed(2)}
              </span>
            )}
          </div>
          {isOnSale && (
            <span className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Save ₹{(Number(product.compare_at_price) - Number(product.price)).toFixed(2)}
            </span>
          )}
        </div>
        
        {/* Actions Layout */}
        {isOwnProduct ? (
          <div className="pt-1 z-10">
            <Link
              to={`/merchant/products/${product.slug}/edit`}
              onClick={(e) => e.stopPropagation()}
              className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all flex items-center justify-center gap-1 shadow-sm"
            >
              Your Product (Edit)
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-1 z-10">
            <button 
              disabled={isOutOfStock}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isOutOfStock) {
                  dispatch(addCartItem({ product, quantity: 1 }));
                  navigate('/checkout');
                }
              }}
              className={`py-2 px-2 sm:px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm ${
                isOutOfStock 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              Buy Now
            </button>
            <button 
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className={`py-2 px-2 sm:px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 ${
                isOutOfStock 
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                  : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border-indigo-200/70 active:scale-[0.98]'
              }`}
              aria-label="Add to cart"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="truncate">Add to Cart</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
