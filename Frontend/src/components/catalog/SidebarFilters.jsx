import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories } from '../../features/catalog/catalogSlice';
import { ChevronDown, ChevronUp, FilterX, ListFilter, Clock, DollarSign, Star } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

export default function SidebarFilters() {
  const dispatch = useDispatch();
  const { categories, status: catStatus } = useSelector((state) => state.catalog);
  const [searchParams, setSearchParams] = useSearchParams();

  // Local state for expandable sections
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isPriceOpen, setIsPriceOpen] = useState(true);
  const [isSortOpen, setIsSortOpen] = useState(true);

  // Local state for price inputs to debounce URL updates
  const minPriceParam = searchParams.get('min_price') || '';
  const maxPriceParam = searchParams.get('max_price') || '';
  const [minPrice, setMinPrice] = useState(minPriceParam);
  const [maxPrice, setMaxPrice] = useState(maxPriceParam);

  const debouncedMinPrice = useDebounce(minPrice, 600);
  const debouncedMaxPrice = useDebounce(maxPrice, 600);

  useEffect(() => {
    if (catStatus === 'idle') {
      dispatch(fetchCategories());
    }
  }, [catStatus, dispatch]);

  // Sync price params from URL to local state if URL changes externally
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMinPrice(searchParams.get('min_price') || '');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMaxPrice(searchParams.get('max_price') || '');
  }, [searchParams]);

  // Update URL when debounced price changes
  useEffect(() => {
    const currentMin = searchParams.get('min_price') || '';
    const currentMax = searchParams.get('max_price') || '';

    if (debouncedMinPrice !== currentMin || debouncedMaxPrice !== currentMax) {
      const newParams = new URLSearchParams(searchParams);
      if (debouncedMinPrice) newParams.set('min_price', debouncedMinPrice);
      else newParams.delete('min_price');
      
      if (debouncedMaxPrice) newParams.set('max_price', debouncedMaxPrice);
      else newParams.delete('max_price');
      
      newParams.delete('page'); // Reset pagination
      setSearchParams(newParams);
    }
  }, [debouncedMinPrice, debouncedMaxPrice, searchParams, setSearchParams]);

  const handleCategoryChange = (slug) => {
    const newParams = new URLSearchParams(searchParams);
    if (newParams.get('category') === slug) {
      newParams.delete('category'); // Toggle off
    } else {
      newParams.set('category', slug);
    }
    newParams.delete('page');
    setSearchParams(newParams);
  };

  const handleSortChange = (e) => {
    const value = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('ordering', value);
    } else {
      newParams.delete('ordering');
    }
    newParams.delete('page');
    setSearchParams(newParams);
  };

  const currentCategory = searchParams.get('category');
  const currentSort = searchParams.get('ordering') || '';

  const clearAllFilters = () => {
    const newParams = new URLSearchParams();
    const search = searchParams.get('search');
    if (search) newParams.set('search', search); // preserve search
    setSearchParams(newParams);
    setMinPrice('');
    setMaxPrice('');
  };

  const hasFilters = searchParams.get('category') || searchParams.get('min_price') || searchParams.get('max_price') || searchParams.get('ordering');

  return (
    <div className="w-full lg:w-64 flex-shrink-0 mb-8 lg:mb-0 lg:pr-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">Filters</h2>
        {hasFilters && (
          <button 
            onClick={clearAllFilters}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <FilterX className="h-3 w-3" /> Clear All
          </button>
        )}
      </div>

      {/* Sort Section */}
      <div className="border-b border-slate-200 py-4">
        <button 
          className="flex items-center justify-between w-full text-left" 
          onClick={() => setIsSortOpen(!isSortOpen)}
        >
          <span className="font-semibold text-slate-900">Sort By</span>
          {isSortOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </button>
        
        {isSortOpen && (
          <div className="mt-4 space-y-2">
            {[
              { value: '', label: 'Recommended', icon: ListFilter },
              { value: '-created_at', label: 'Newest Arrivals', icon: Clock },
              { value: 'price', label: 'Price: Low to High', icon: DollarSign },
              { value: '-price', label: 'Price: High to Low', icon: DollarSign },
              { value: '-rating', label: 'Top Rated', icon: Star },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleSortChange({ target: { value: option.value } })}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-all ${
                  currentSort === option.value
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium shadow-sm'
                    : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <option.icon className={`h-4 w-4 ${currentSort === option.value ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {option.label}
                </div>
                {currentSort === option.value && (
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Categories Section */}
      <div className="border-b border-slate-200 py-4">
        <button 
          className="flex items-center justify-between w-full text-left" 
          onClick={() => setIsCategoryOpen(!isCategoryOpen)}
        >
          <span className="font-semibold text-slate-900">Categories</span>
          {isCategoryOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </button>
        
        {isCategoryOpen && (
          <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
            {catStatus === 'loading' ? (
              <div className="text-sm text-slate-500 animate-pulse">Loading categories...</div>
            ) : categories.length === 0 ? (
              <div className="text-sm text-slate-500">No categories found.</div>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="flex items-center">
                  <input
                    id={`cat-${cat.slug}`}
                    name="category"
                    type="checkbox"
                    checked={currentCategory === cat.slug}
                    onChange={() => handleCategoryChange(cat.slug)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor={`cat-${cat.slug}`} className="ml-3 text-sm text-slate-600 cursor-pointer hover:text-slate-900">
                    {cat.name}
                  </label>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Price Range Section */}
      <div className="py-4">
        <button 
          className="flex items-center justify-between w-full text-left" 
          onClick={() => setIsPriceOpen(!isPriceOpen)}
        >
          <span className="font-semibold text-slate-900">Price Range</span>
          {isPriceOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </button>
        
        {isPriceOpen && (
          <div className="mt-4 flex items-center gap-2">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-500 sm:text-sm">₹</span>
              </div>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-3 py-2 sm:text-sm border-slate-300 rounded-md"
                placeholder="Min"
              />
            </div>
            <span className="text-slate-500">-</span>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-500 sm:text-sm">₹</span>
              </div>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-3 py-2 sm:text-sm border-slate-300 rounded-md"
                placeholder="Max"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
