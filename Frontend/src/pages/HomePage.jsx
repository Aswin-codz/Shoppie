import { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { getHomepageProducts, getPersonalizedFeed } from '../features/catalog/catalogApi';
import { recentlyViewedApi } from '../features/catalog/recentlyViewedApi';
import { fetchProducts, fetchMoreProducts } from '../features/catalog/catalogSlice';
import SidebarFilters from '../components/catalog/SidebarFilters';
import ProductGrid from '../components/catalog/ProductGrid';
import TrendingCarousel from '../components/catalog/TrendingCarousel';
import { 
  TrendingUp, Sparkles, Star, SearchX, Clock, SlidersHorizontal, X 
} from 'lucide-react';

export default function HomePage() {
  const dispatch = useDispatch();
  const { products, status, pagination, didYouMean, fallbackProducts } = useSelector((state) => state.catalog);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [homepageData, setHomepageData] = useState(null);
  const [personalizedFeed, setPersonalizedFeed] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loadingHomepage, setLoadingHomepage] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Active section tab: 'recommended' is default per request
  const [activeTab, setActiveTab] = useState('recommended');

  // Mobile filters drawer toggle
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Infinite scroll tracking
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef(null);

  const isSearchOrFilterMode = [...searchParams.keys()].length > 0;

  useEffect(() => {
    if (!homepageData) {
      setLoadingHomepage(true);
      getHomepageProducts().then((homeData) => {
        setHomepageData(homeData);
        if (homeData.recommended_for_you) {
          setPersonalizedFeed(homeData.recommended_for_you);
        } else {
          getPersonalizedFeed().then(feedData => setPersonalizedFeed(feedData)).catch(() => []);
        }
        
        if (homeData.recently_viewed) {
          setRecentlyViewed(homeData.recently_viewed);
        } else if (isAuthenticated) {
          recentlyViewedApi.getRecentlyViewed().then(viewedData => {
            if (viewedData && Array.isArray(viewedData)) {
              setRecentlyViewed(viewedData.map(item => item.product));
            }
          }).catch(() => []);
        }
      }).finally(() => {
        setLoadingHomepage(false);
      });
    }

    if (isSearchOrFilterMode) {
      const params = Object.fromEntries([...searchParams]);
      dispatch(fetchProducts(params));
    }
  }, [searchParams, dispatch, isSearchOrFilterMode, homepageData, isAuthenticated]);

  // Infinite scroll intersection observer handler
  const handleObserver = useCallback((entries) => {
    const target = entries[0];
    if (target.isIntersecting && pagination.next && !loadingMore && status !== 'loading') {
      const nextPage = parseInt(searchParams.get('page') || '1', 10) + 1;
      setLoadingMore(true);
      const params = Object.fromEntries([...searchParams]);
      params.page = nextPage;
      dispatch(fetchMoreProducts(params)).finally(() => {
        setLoadingMore(false);
      });
    }
  }, [pagination.next, loadingMore, status, searchParams, dispatch]);

  useEffect(() => {
    const option = { root: null, rootMargin: "150px", threshold: 0 };
    const observer = new IntersectionObserver(handleObserver, option);
    const currentElem = observerRef.current;
    if (currentElem) observer.observe(currentElem);
    return () => {
      if (currentElem) observer.unobserve(currentElem);
    };
  }, [handleObserver]);

  const handleDidYouMeanClick = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('search', didYouMean);
    setSearchParams(newParams);
  };

  // Top 7 trending products for carousel (minimum 1, maximum 7)
  const trendingProducts = (homepageData?.featured && homepageData.featured.length > 0)
    ? homepageData.featured.slice(0, 7)
    : (homepageData?.new_arrivals || []).slice(0, 7);

  // Tabs configuration
  const tabs = [
    { id: 'recommended', label: 'Recommended For You', icon: Star, count: personalizedFeed?.length || 0 },
    { id: 'trending', label: 'Trending Now', icon: TrendingUp, count: homepageData?.featured?.length || 0 },
    { id: 'new_arrivals', label: 'New Arrivals', icon: Sparkles, count: homepageData?.new_arrivals?.length || 0 },
    { id: 'top_rated', label: 'Highest Rated', icon: Star, count: homepageData?.top_rated?.length || 0 },
    ...(recentlyViewed.length > 0 ? [{ id: 'recently_viewed', label: 'Recently Viewed', icon: Clock, count: recentlyViewed.length }] : [])
  ];

  const getActiveTabProducts = () => {
    switch (activeTab) {
      case 'trending':
        return homepageData?.featured || [];
      case 'new_arrivals':
        return homepageData?.new_arrivals || [];
      case 'top_rated':
        return homepageData?.top_rated || [];
      case 'recently_viewed':
        return recentlyViewed || [];
      case 'recommended':
      default:
        return personalizedFeed.length > 0 ? personalizedFeed : (homepageData?.featured || []);
    }
  };

  return (
    <div className="w-full pb-16">
      {/* Mobile Filters Toggle Button */}
      <div className="lg:hidden flex justify-between items-center mb-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
        <span className="text-sm font-semibold text-slate-700">Filter & Sort</span>
        <button
          onClick={() => setIsMobileFiltersOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Refine Search
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sticky Desktop Filters Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-scroll scrollbar-thin scrollbar-thumb-indigo-500 overflow-x-hidden pr-1">
          <SidebarFilters />
        </aside>

        {/* Mobile Filters Slide-over / Modal */}
        {isMobileFiltersOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsMobileFiltersOpen(false)} 
            />
            <div className="relative ml-auto w-full max-w-xs h-full bg-white shadow-2xl p-6 overflow-y-auto flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <h3 className="font-bold text-lg text-slate-900">Filters</h3>
                <button 
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarFilters />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0">
          {isSearchOrFilterMode ? (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">
                  {searchParams.get('search') 
                    ? `Search Results for "${searchParams.get('search')}"` 
                    : 'Filtered Products'}
                </h1>
                {status === 'succeeded' && (
                  <span className="text-sm text-slate-500">
                    Showing {products.length} of {pagination.count} products
                  </span>
                )}
              </div>

              {status === 'succeeded' && products.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 p-8">
                  <SearchX className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No products found</h3>
                  
                  {didYouMean ? (
                    <p className="text-slate-500 mb-8">
                      Did you mean: <button onClick={handleDidYouMeanClick} className="text-indigo-600 font-semibold underline hover:text-indigo-800">{didYouMean}</button>?
                    </p>
                  ) : (
                    <p className="text-slate-500 mb-8">Try adjusting your search or filters to find what you're looking for.</p>
                  )}
                  
                  {(fallbackProducts.length > 0 || (homepageData?.featured && homepageData.featured.length > 0)) && (
                    <div className="text-left mt-12 border-t border-slate-100 pt-12">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        You may also like
                      </h2>
                      <ProductGrid products={fallbackProducts.length > 0 ? fallbackProducts : homepageData.featured} isLoading={false} />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <ProductGrid products={products} isLoading={status === 'loading'} />

                  {/* Infinite Scroll trigger point */}
                  <div ref={observerRef} className="py-8 text-center flex justify-center items-center">
                    {loadingMore ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent" />
                        Loading more products...
                      </div>
                    ) : pagination.next ? (
                      <span className="text-xs text-slate-400">Scroll down to load more</span>
                    ) : products.length > 0 ? (
                      <span className="text-sm text-slate-400 font-medium">You've reached the end of the collection</span>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {loadingHomepage ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                </div>
              ) : (
                <>
                  {/* Top 7 Trending Products Carousel (Replaces Hero Banner) */}
                  {trendingProducts.length > 0 && (
                    <TrendingCarousel products={trendingProducts} />
                  )}

                  {/* Sections Tab Navigation */}
                  <div className="border-b border-slate-200">
                    <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-200 ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
                            {tab.label}
                            {tab.count > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {tab.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Tab Content Section */}
                  <section className="pt-2">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                        {activeTab === 'recommended' && <Star className="w-6 h-6 text-amber-500 fill-amber-500" />}
                        {activeTab === 'trending' && <TrendingUp className="w-6 h-6 text-indigo-600" />}
                        {activeTab === 'new_arrivals' && <Sparkles className="w-6 h-6 text-blue-600" />}
                        {activeTab === 'top_rated' && <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />}
                        {activeTab === 'recently_viewed' && <Clock className="w-6 h-6 text-teal-600" />}
                        {tabs.find(t => t.id === activeTab)?.label}
                      </h2>
                    </div>

                    <ProductGrid 
                      products={getActiveTabProducts()} 
                      isLoading={loadingHomepage} 
                    />
                  </section>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
