import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addCartItem } from '../../features/cart/cartSlice';

const DUAL_TONE_PALETTES = [
  {
    id: 'indigo-violet',
    bgGradient: 'from-slate-950 via-slate-900 to-indigo-950',
    borderClass: 'border-indigo-500/30',
    ambientGlow1: 'from-indigo-500/25 to-transparent',
    ambientGlow2: 'from-violet-400/20 to-transparent',
    haloGradient: 'from-indigo-500 via-violet-400 to-purple-500',
    badge: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40',
    categoryBadge: 'bg-slate-800/80 text-indigo-300 border-indigo-500/20',
    button: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40',
    dotActive: 'bg-indigo-400',
    imageBox: 'bg-slate-900/90 border-indigo-500/30',
  },
  {
    id: 'emerald-mint',
    bgGradient: 'from-slate-950 via-slate-900 to-emerald-950',
    borderClass: 'border-emerald-500/30',
    ambientGlow1: 'from-emerald-500/25 to-transparent',
    ambientGlow2: 'from-teal-300/20 to-transparent',
    haloGradient: 'from-emerald-500 via-teal-400 to-cyan-400',
    badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
    categoryBadge: 'bg-slate-800/80 text-emerald-300 border-emerald-500/20',
    button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/40',
    dotActive: 'bg-emerald-400',
    imageBox: 'bg-slate-900/90 border-emerald-500/30',
  },
  {
    id: 'rose-coral',
    bgGradient: 'from-slate-950 via-slate-900 to-rose-950',
    borderClass: 'border-rose-500/30',
    ambientGlow1: 'from-rose-500/25 to-transparent',
    ambientGlow2: 'from-pink-400/20 to-transparent',
    haloGradient: 'from-rose-500 via-pink-400 to-amber-400',
    badge: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
    categoryBadge: 'bg-slate-800/80 text-rose-300 border-rose-500/20',
    button: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40',
    dotActive: 'bg-rose-400',
    imageBox: 'bg-slate-900/90 border-rose-500/30',
  },
  {
    id: 'blue-solar',
    bgGradient: 'from-slate-950 via-slate-900 to-blue-950',
    borderClass: 'border-blue-500/30',
    ambientGlow1: 'from-sky-400/25 to-transparent',
    ambientGlow2: 'from-amber-400/20 to-transparent',
    haloGradient: 'from-blue-500 via-sky-400 to-amber-300',
    badge: 'bg-blue-500/20 text-sky-200 border-blue-500/40',
    categoryBadge: 'bg-slate-800/80 text-sky-300 border-blue-500/20',
    button: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/40',
    dotActive: 'bg-sky-400',
    imageBox: 'bg-slate-900/90 border-blue-500/30',
  },
  {
    id: 'purple-cyan',
    bgGradient: 'from-slate-950 via-slate-900 to-purple-950',
    borderClass: 'border-purple-500/30',
    ambientGlow1: 'from-purple-500/25 to-transparent',
    ambientGlow2: 'from-cyan-400/20 to-transparent',
    haloGradient: 'from-purple-500 via-fuchsia-400 to-cyan-400',
    badge: 'bg-purple-500/20 text-purple-200 border-purple-500/40',
    categoryBadge: 'bg-slate-800/80 text-purple-300 border-purple-500/20',
    button: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/40',
    dotActive: 'bg-purple-400',
    imageBox: 'bg-slate-900/90 border-purple-500/30',
  },
  {
    id: 'charcoal-amber',
    bgGradient: 'from-slate-950 via-slate-900 to-amber-950',
    borderClass: 'border-amber-500/30',
    ambientGlow1: 'from-amber-500/25 to-transparent',
    ambientGlow2: 'from-orange-400/20 to-transparent',
    haloGradient: 'from-amber-500 via-orange-400 to-yellow-300',
    badge: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
    categoryBadge: 'bg-slate-800/80 text-amber-300 border-amber-500/20',
    button: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/40',
    dotActive: 'bg-amber-400',
    imageBox: 'bg-slate-900/90 border-amber-500/30',
  },
  {
    id: 'cyan-teal',
    bgGradient: 'from-slate-950 via-slate-900 to-teal-950',
    borderClass: 'border-teal-500/30',
    ambientGlow1: 'from-cyan-500/25 to-transparent',
    ambientGlow2: 'from-teal-300/20 to-transparent',
    haloGradient: 'from-cyan-400 via-teal-400 to-emerald-400',
    badge: 'bg-teal-500/20 text-teal-200 border-teal-500/40',
    categoryBadge: 'bg-slate-800/80 text-teal-300 border-teal-500/20',
    button: 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/40',
    dotActive: 'bg-teal-400',
    imageBox: 'bg-slate-900/90 border-teal-500/30',
  },
  {
    id: 'fuchsia-rose',
    bgGradient: 'from-slate-950 via-slate-900 to-fuchsia-950',
    borderClass: 'border-fuchsia-500/30',
    ambientGlow1: 'from-fuchsia-500/25 to-transparent',
    ambientGlow2: 'from-pink-300/20 to-transparent',
    haloGradient: 'from-fuchsia-500 via-pink-400 to-rose-400',
    badge: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40',
    categoryBadge: 'bg-slate-800/80 text-fuchsia-300 border-fuchsia-500/20',
    button: 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-fuchsia-600/40',
    dotActive: 'bg-fuchsia-400',
    imageBox: 'bg-slate-900/90 border-fuchsia-500/30',
  }
];

export default function TrendingCarousel({ products = [] }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Ensure minimum 1 and maximum 7 items
  const items = products.slice(0, 7);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [paletteMap, setPaletteMap] = useState({});

  useEffect(() => {
    // Generate random dual-tone color palettes per product showcase
    if (items.length > 0) {
      const map = {};
      const shuffled = [...DUAL_TONE_PALETTES].sort(() => 0.5 - Math.random());
      items.forEach((item, index) => {
        map[item.id || index] = shuffled[index % shuffled.length];
      });
      setPaletteMap(map);
    }
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [items.length, isHovered]);

  if (!items || items.length === 0) return null;

  const current = items[currentIndex] || items[0];
  const palette = paletteMap[current.id || currentIndex] || DUAL_TONE_PALETTES[currentIndex % DUAL_TONE_PALETTES.length];

  const primaryImage = current.primary_image || 
                       current.images?.find(img => img.is_primary)?.image_url || 
                       current.images?.[0]?.image_url || 
                       current.images?.[0]?.image || 
                       current.images?.[0]?.optimized_url || 
                       'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80';

  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(addCartItem({ product: current, quantity: 1 }));
    navigate('/checkout');
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <div 
      className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border transition-all duration-700 bg-gradient-to-r ${palette.bgGradient} ${palette.borderClass} my-3 sm:my-6`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dynamic ambient dual-tone light glows */}
      <div className={`absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-bl ${palette.ambientGlow1} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />
      <div className={`absolute bottom-0 left-0 w-64 sm:w-80 h-64 sm:h-80 bg-gradient-to-tr ${palette.ambientGlow2} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />

      <div className="relative z-20 flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id || currentIndex}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.80, ease: 'easeOut' }}
            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 items-center p-3.5 sm:p-8 lg:p-12 pb-8 sm:pb-12"
          >
            {/* Product Image (Shown first or scaled on mobile) */}
            <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center items-center">
              <Link to={`/products/${current.slug}`} className="relative group w-full max-w-[170px] sm:max-w-[240px] lg:max-w-sm">
                <div className={`absolute -inset-1 bg-gradient-to-r ${palette.haloGradient} rounded-2xl sm:rounded-3xl blur-lg sm:blur-xl opacity-40 group-hover:opacity-75 transition-all duration-700`} />
                <div className={`relative aspect-square w-full rounded-2xl sm:rounded-3xl overflow-hidden ${palette.imageBox} border flex items-center justify-center p-3 sm:p-6 backdrop-blur-md shadow-xl`}>
                  <img
                    src={primaryImage}
                    alt={current.name}
                    className="max-w-[100%] max-h-[100%] w-auto h-auto object-contain transform group-hover:scale-105 transition-transform duration-500 rounded-xl"
                    loading="lazy"
                  />
                </div>
              </Link>
            </div>

            {/* Text Information */}
            <div className="lg:col-span-7 order-2 lg:order-1 flex flex-col justify-center space-y-2 sm:space-y-4 text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2">
                <span className={`px-2.5 py-0.5 sm:px-3 sm:py-1 ${palette.badge} border text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider transition-colors duration-500`}>
                  🔥 Trending #{currentIndex + 1} of {items.length}
                </span>
                {current.category && (
                  <span className={`px-2.5 py-0.5 sm:px-3 sm:py-1 ${palette.categoryBadge} border text-[10px] sm:text-xs font-medium rounded-full transition-colors duration-500`}>
                    {typeof current.category === 'object' ? current.category.name : current.category}
                  </span>
                )}
                {current.rating > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-300 text-[10px] sm:text-xs font-semibold bg-amber-400/10 px-2 py-0.5 sm:py-1 rounded-full border border-amber-400/20">
                    <Star className="w-3 h-3 fill-amber-300" />
                    {Number(current.rating).toFixed(1)}
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-3xl lg:text-5xl font-black text-white leading-tight tracking-tight line-clamp-1 sm:line-clamp-2">
                {current.name}
              </h2>

              <p className="hidden sm:block text-xs sm:text-base text-slate-300 line-clamp-2 max-w-xl font-light">
                {typeof current.description === 'string' && current.description.startsWith('[')
                  ? 'Premium high quality product crafted for excellence.'
                  : current.description || 'Discover incredible quality and unmatched performance.'}
              </p>

              <div className="flex items-baseline justify-center lg:justify-start gap-2 sm:gap-3 pt-0.5 sm:pt-2">
                <span className="text-xl sm:text-3xl lg:text-4xl font-black text-white">
                  ₹{Number(current.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                {current.compare_at_price && Number(current.compare_at_price) > Number(current.price) && (
                  <span className="text-sm sm:text-lg text-slate-400 line-through font-medium">
                    ₹{Number(current.compare_at_price).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 pt-2 sm:pt-4">
                <button
                  onClick={handleBuyNow}
                  className={`px-4 sm:px-6 py-2 sm:py-3 ${palette.button} text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Buy Now
                </button>
                <Link
                  to={`/products/${current.slug}`}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-800/80 hover:bg-slate-700/80 text-white text-xs sm:text-sm font-semibold rounded-xl border border-slate-700/70 transition-all flex items-center justify-center gap-1.5 backdrop-blur-sm"
                >
                  View Details
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Chevrons */}
      {items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Previous trending product"
            className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 z-30 p-1.5 sm:p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-white hover:text-slate-900 transition-colors border border-slate-700 shadow-md backdrop-blur-sm"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next trending product"
            className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 z-30 p-1.5 sm:p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-white hover:text-slate-900 transition-colors border border-slate-700 shadow-md backdrop-blur-sm"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex 
                    ? `w-6 sm:w-8 ${palette.dotActive}` 
                    : 'w-1.5 sm:w-2 bg-slate-600/70 hover:bg-slate-400'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
