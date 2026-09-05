import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductDetail, fetchRelatedProducts, clearSelectedProduct, addRecentlyViewed, trackProductEvent } from '../features/catalog/catalogSlice';
import { getFrequentlyBoughtTogether } from '../features/catalog/catalogApi';
import ImageGallery from '../components/catalog/ImageGallery';
import ProductGrid from '../components/catalog/ProductGrid';
import ReviewSection from '../components/catalog/ReviewSection';
import { Star, ShoppingCart, Store, ShieldCheck, Truck, Heart, Flag, X, Activity, ChevronDown, ChevronUp, ShoppingBag, Info } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { addCartItem } from '../features/cart/cartSlice';
import { toggleWishlist } from '../features/wishlist/wishlistSlice';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedProduct, relatedProducts, status, recentlyViewed: storeRecentlyViewed } = useSelector((state) => state.catalog);
  const { items: wishlistItems } = useSelector((state) => state.wishlist);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [frequentlyBoughtTogether, setFrequentlyBoughtTogether] = useState([]);
  const [openAccordions, setOpenAccordions] = useState({ 0: true });

  const toggleAccordion = (index) => {
    setOpenAccordions(prev => ({ ...prev, [index]: !prev[index] }));
  };
  
  // Report Product state
  const { user } = useSelector(state => state.auth);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [isSubscribingToAlert, setIsSubscribingToAlert] = useState(false);

  useEffect(() => {
    dispatch(fetchProductDetail(slug));
    dispatch(fetchRelatedProducts(slug));
    dispatch(trackProductEvent({ slug, eventType: 'view' }));
    
    getFrequentlyBoughtTogether(slug).then(data => {
      setFrequentlyBoughtTogether(data);
    }).catch(err => console.error("FBT Error:", err));
    
    return () => {
      dispatch(clearSelectedProduct());
      setFrequentlyBoughtTogether([]);
    };
  }, [dispatch, slug]);

  useEffect(() => {
    if (selectedProduct) {
      dispatch(addRecentlyViewed(selectedProduct));
      
      // Update local state for display (exclude current product)
      const displayRecent = storeRecentlyViewed.filter(p => p.id !== selectedProduct.id).slice(0, 4);
      setRecentlyViewed(displayRecent);
    }
  }, [selectedProduct, dispatch]);

  if (status === 'loading' || !selectedProduct) {
    return (
      <div className="animate-pulse">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="w-full lg:w-1/2 aspect-square bg-slate-200 rounded-xl"></div>
          <div className="w-full lg:w-1/2 space-y-6">
            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            <div className="h-6 bg-slate-200 rounded w-1/4"></div>
            <div className="h-10 bg-slate-200 rounded w-1/3"></div>
            <div className="h-40 bg-slate-200 rounded w-full"></div>
            <div className="h-12 bg-slate-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  const isOutOfStock = selectedProduct.stock_quantity <= 0;
  const isWishlisted = wishlistItems.some(i => i.product.id === selectedProduct.id);
  const isOwnProduct = Boolean(
    user && 
    selectedProduct && 
    (user.id === selectedProduct.merchant_id || (user.role === 'MERCHANT' && user.username === selectedProduct.merchant_name))
  );

  const handleAddToCart = () => {
    if (isOwnProduct) {
      import('react-hot-toast').then(({ toast }) => toast.error("You cannot purchase your own product."));
      return;
    }
    if (!isOutOfStock) {
      dispatch(addCartItem({ product: selectedProduct, quantity: 1 }));
      import('react-hot-toast').then(({ toast }) => toast.success(`Added ${selectedProduct.name} to cart`));
    }
  };

  const handleBuyNow = () => {
    if (isOwnProduct) {
      import('react-hot-toast').then(({ toast }) => toast.error("You cannot purchase your own product."));
      return;
    }
    if (!isOutOfStock) {
      dispatch(addCartItem({ product: selectedProduct, quantity: 1 }));
      navigate('/checkout');
    }
  };

  const handleToggleWishlist = () => {
    dispatch(toggleWishlist(selectedProduct));
  };
  
  const handleReportProduct = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsReporting(true);
    try {
      // Inline import just for this function if needed, or use existing axiosClient
      const { default: axiosClient } = await import('../api/axiosClient');
      await axiosClient.post(`/catalog/products/${selectedProduct.slug}/report/`, {
        reason: reportReason,
        notes: reportNotes
      });
      import('react-hot-toast').then(({ toast }) => toast.success("Product reported successfully."));
      setShowReportModal(false);
      setReportReason('');
      setReportNotes('');
    } catch (err) {
      import('react-hot-toast').then(({ toast }) => {
        if (err.response?.data?.detail) toast.error(err.response.data.detail);
        else toast.error("Failed to report product.");
      });
    } finally {
      setIsReporting(false);
    }
  };

  const handleStockAlert = async () => {
    if (!user) {
      import('react-hot-toast').then(({ toast }) => toast.error("Please sign in to subscribe to stock alerts."));
      return;
    }
    setIsSubscribingToAlert(true);
    try {
      const { default: axiosClient } = await import('../api/axiosClient');
      await axiosClient.post(`/catalog/products/${selectedProduct.slug}/stock-alert/`);
      import('react-hot-toast').then(({ toast }) => toast.success("You will be notified when this item is back in stock."));
    } catch (err) {
      import('react-hot-toast').then(({ toast }) => toast.error("Failed to subscribe to stock alert."));
    } finally {
      setIsSubscribingToAlert(false);
    }
  };

  return (
    <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-6 space-y-16 pb-16">
      {/* Product Top Section */}
      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* Left: Images */}
        <div className="w-full lg:w-1/2 lg:sticky lg:top-24">
          <ImageGallery images={selectedProduct.images} productName={selectedProduct.name} />
        </div>

        {/* Right: Details */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <Link to={`/?category=${selectedProduct.category?.slug}`} className="text-sm font-medium text-indigo-600 hover:underline mb-2 inline-block">
            {selectedProduct.category?.name}
          </Link>
          
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-slate-900 pr-8">{selectedProduct.name}</h1>
            <button
              onClick={handleToggleWishlist}
              className="p-3 rounded-full bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0"
            >
              <Heart className={`h-6 w-6 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>
          
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center text-amber-400">
                <Star className="h-5 w-5 fill-current" />
                <span className="ml-1 text-base font-medium text-slate-700">
                  {Number(selectedProduct.rating).toFixed(1)}
                </span>
                <span className="ml-1 text-sm text-slate-500 hover:underline cursor-pointer" onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}>
                  ({selectedProduct.review_count || 0} reviews)
                </span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <Store className="h-4 w-4" />
                Sold by <span className="font-medium text-slate-700">{selectedProduct.merchant_name}</span>
              </span>
              {user && (
                <>
                  <span className="text-slate-300">|</span>
                  <button 
                    onClick={() => setShowReportModal(true)}
                    className="text-sm text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                    title="Report Product"
                  >
                    <Flag className="h-4 w-4" />
                    Report
                  </button>
                </>
              )}
            </div>

            {/* Merchant Trust Badges */}
            {selectedProduct.merchant_reputation && (
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedProduct.merchant_reputation.rating >= 4.5 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200" title={`Average rating of ${selectedProduct.merchant_reputation.rating}`}>
                    <ShieldCheck className="h-3 w-3" />
                    Highly Rated Seller
                  </span>
                )}
                {selectedProduct.merchant_reputation.fulfillment >= 95 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200" title={`${selectedProduct.merchant_reputation.fulfillment}% fulfillment success rate`}>
                    <Truck className="h-3 w-3" />
                    Reliable Seller
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-end gap-3 mb-8">
            <span className="text-4xl font-black text-slate-900 tracking-tight">
              ₹{Number(selectedProduct.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            {selectedProduct.compare_at_price && Number(selectedProduct.compare_at_price) > Number(selectedProduct.price) && (
              <span className="text-lg text-slate-400 line-through mb-1">
                ₹{Number(selectedProduct.compare_at_price).toFixed(2)}
              </span>
            )}
          </div>

          {/* Collapsible 3D Card / Glassmorphism Accordion Description */}
          <div className="mb-8 space-y-3">
            {(() => {
              let parsedSections = [];
              try {
                if (typeof selectedProduct.description === 'string' && selectedProduct.description.startsWith('[')) {
                  parsedSections = JSON.parse(selectedProduct.description);
                }
              } catch (e) {}

              if (parsedSections.length === 0) {
                parsedSections = [
                  {
                    heading: 'Product Overview',
                    icon: 'Info',
                    content: selectedProduct.description || 'No detailed description provided.'
                  },
                  {
                    heading: 'Shipping & Delivery',
                    icon: 'Truck',
                    content: 'Fast reliable delivery directly to your doorstep. Free shipping on all orders over ₹499 with real-time tracking.'
                  },
                  {
                    heading: 'Seller Guarantee & Authenticity',
                    icon: 'ShieldCheck',
                    content: `Authentic product guaranteed. Sold and fulfilled by ${selectedProduct.merchant_name || 'Verified Merchant'}. Includes 7-day hassle-free replacement or return support.`
                  }
                ];
              }

              return parsedSections.map((section, index) => {
                const IconComponent = LucideIcons[section.icon] || LucideIcons.Info;
                const isOpen = Boolean(openAccordions[index]);

                return (
                  <div 
                    key={index}
                    className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgb(0,0,0,0.06)] transition-all duration-300 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleAccordion(index)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                          {IconComponent && <IconComponent className="w-4 h-4" />}
                        </div>
                        <span className="font-bold text-slate-900 text-base">
                          {section.heading || 'Details'}
                        </span>
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                          isOpen ? 'rotate-180 text-indigo-600' : ''
                        }`} 
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line border-t border-slate-100">
                        {section.content}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          {/* Tags */}
          {selectedProduct.tags && selectedProduct.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {selectedProduct.tags.map(tag => (
                <Link 
                  key={tag.id}
                  to={`/?search=${tag.name}`}
                  className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full hover:bg-slate-200 transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-auto space-y-6">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
                {isOutOfStock ? (
                  <span className="font-medium flex items-center gap-2">Out of Stock</span>
                ) : (
                  <span className="font-medium flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> In Stock ({selectedProduct.stock_quantity} available)
                  </span>
                )}
              </div>
            </div>

            {isOwnProduct ? (
              <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-200/80 shadow-sm space-y-3">
                <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
                  <Store className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Your Merchant Product Listing</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  You are the verified merchant selling this product. Purchasing your own inventory is disabled to preserve stock integrity.
                </p>
                <div className="pt-1">
                  <Link
                    to={`/merchant/products/${selectedProduct.slug}/edit`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                  >
                    Manage / Edit Product
                  </Link>
                </div>
              </div>
            ) : isOutOfStock ? (
              <button
                onClick={handleStockAlert}
                disabled={isSubscribingToAlert}
                className="w-full bg-slate-800 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Activity className="h-5 w-5" />
                {isSubscribingToAlert ? 'Subscribing...' : 'Notify Me When Available'}
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleBuyNow}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98] flex items-center justify-center gap-2 hover:scale-[1.01]"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Buy Now
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="w-full bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 hover:scale-[1.01]"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Add to Cart
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-500 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-slate-400" />
                <span>Free shipping on orders over ₹499</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-slate-400" />
                <span>Secure payment processing</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div className="pt-16 border-t border-slate-200">
        <ReviewSection productSlug={selectedProduct.slug} />
      </div>
      
      {/* Frequently Bought Together Section */}
      {frequentlyBoughtTogether && frequentlyBoughtTogether.length > 0 && (
        <div className="pt-16 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Frequently Bought Together</h2>
          <ProductGrid products={frequentlyBoughtTogether} isLoading={false} />
        </div>
      )}

      {/* Related Products Section */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="pt-16 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Related Products</h2>
          <ProductGrid products={relatedProducts} isLoading={false} />
        </div>
      )}

      {/* Recently Viewed Section */}
      {recentlyViewed && recentlyViewed.length > 0 && (
        <div className="pt-16 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Recently Viewed</h2>
          <ProductGrid products={recentlyViewed} isLoading={false} />
        </div>
      )}
      
      {/* Report Product Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Report Product</h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReportProduct} className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a reason...</option>
                  <option value="MISLEADING">Misleading product</option>
                  <option value="COUNTERFEIT">Counterfeit / Fake</option>
                  <option value="INAPPROPRIATE">Inappropriate content</option>
                  <option value="PROHIBITED">Prohibited item</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  rows={3}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Provide any additional details..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReporting}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isReporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
