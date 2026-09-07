import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Search, ShoppingCart, LogOut, Package, Heart, X } from 'lucide-react';
import { logoutUser } from '../../features/auth/authSlice';
import { useDebounce } from '../../hooks/useDebounce';
import { getSearchSuggestions, getSearchHistory } from '../../features/catalog/catalogApi';
import CartDrawer from '../cart/CartDrawer';
import NotificationCenter from './NotificationCenter';

export default function Navbar() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { totalQuantity } = useSelector((state) => state.cart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(Boolean(searchParams.get('search')));
  const profileRef = useRef(null);

  // Local state for the search input
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.length >= 2) {
      getSearchSuggestions(debouncedSearchTerm).then(data => {
        setSuggestions(data);
      }).catch(() => setSuggestions([]));
    } else {
      setSuggestions([]);
      if (isAuthenticated && !debouncedSearchTerm) {
        getSearchHistory().then(data => {
          setHistory(data);
        }).catch(() => setHistory([]));
      }
    }
  }, [debouncedSearchTerm, isAuthenticated]);

  // Sync search URL param when debounced term changes
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (debouncedSearchTerm !== currentSearch) {
      const newParams = new URLSearchParams(searchParams);
      if (debouncedSearchTerm) {
        newParams.set('search', debouncedSearchTerm);
        newParams.delete('page');
      } else {
        newParams.delete('search');
      }
      setSearchParams(newParams);
      if (window.location.pathname !== '/') {
        navigate(`/?${newParams.toString()}`);
      }
    }
  }, [debouncedSearchTerm, searchParams, setSearchParams, navigate]);

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.query);
    setIsFocused(false);
  };

  // Sync local state if URL changes from outside (e.g., clicking a tag)
  useEffect(() => {
    const q = searchParams.get('search') || '';
    if (q !== searchTerm) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/');
  };

  return (
    <>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-3.5 sm:px-8 lg:px-14 xl:px-16">
          <div className="flex justify-between items-center h-16 gap-2 sm:gap-4">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center group py-1" aria-label="Shopzy Home">
                <img
                  src="/logo.png"
                  alt="Shopzy"
                  className="h-9 sm:h-14 w-auto max-h-14 object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </Link>
            </div>

            {/* Desktop Search Bar (Hidden on mobile) */}
            <div className="hidden md:block flex-1 max-w-2xl mx-2 sm:mx-6 md:mx-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                  placeholder="Search products, brands, categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 250)}
                />

                {/* Autocomplete Dropdown */}
                {isFocused && (suggestions.length > 0 || (!debouncedSearchTerm && history.length > 0)) && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
                    <ul className="max-h-60 overflow-y-auto">
                      {suggestions.length > 0 ? (
                        suggestions.map((suggestion, index) => (
                          <li key={index}>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none flex justify-between items-center"
                              onClick={() => handleSuggestionClick(suggestion)}
                            >
                              <span className="text-sm text-slate-700">{suggestion.query}</span>
                              <span className="text-xs text-slate-400">Suggestion</span>
                            </button>
                          </li>
                        ))
                      ) : (
                        <>
                          <li className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50">Recent Searches</li>
                          {history.map((item, index) => (
                            <li key={`hist-${index}`}>
                              <button
                                type="button"
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none flex justify-between items-center"
                                onClick={() => handleSuggestionClick(item)}
                              >
                                <span className="text-sm text-slate-700">{item.query}</span>
                                <span className="text-xs text-slate-400">History</span>
                              </button>
                            </li>
                          ))}
                        </>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Right Navigation */}
            <div className="flex items-center space-x-1 sm:space-x-3 md:space-x-6">
              {/* Mobile Search Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen((prev) => !prev)}
                className={`p-2 rounded-lg md:hidden transition-colors ${
                  isMobileSearchOpen ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
                }`}
                aria-label="Toggle search"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Wishlist icon */}
              <Link to="/wishlist" className="p-2 text-slate-500 hover:text-indigo-600 transition-colors" aria-label="Wishlist">
                <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
              </Link>

              {/* Cart icon */}
              <Link
                className="p-2 text-slate-500 hover:text-indigo-600 relative transition-colors"
                to="/cart"
                aria-label="Cart"
              >
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                {totalQuantity > 0 && (
                  <span className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] sm:text-xs font-bold rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                    {totalQuantity}
                  </span>
                )}
              </Link>

              {isAuthenticated ? (
                <div className="flex items-center space-x-1 sm:space-x-3 md:space-x-6">
                  <NotificationCenter />
                  <div className="relative" ref={profileRef}>
                    <button
                      type="button"
                      onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                      className="p-1 rounded-full text-slate-700 hover:ring-2 hover:ring-indigo-400 focus:outline-none transition-all flex items-center"
                      aria-label="User profile menu"
                      aria-expanded={isProfileMenuOpen}
                    >
                      {user?.profile_image_url ? (
                        <img src={user.profile_image_url} alt="Profile" className="h-8 w-8 rounded-full object-cover border border-indigo-200" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                          {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                        </div>
                      )}
                    </button>

                    {/* Dropdown Menu */}
                    <div className={`absolute right-0 w-52 mt-2 py-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 transition-all duration-200 ${
                      isProfileMenuOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 pointer-events-none'
                    }`}>
                      <div className="px-4 py-2 border-b border-slate-100 mb-2">
                        <p className="text-sm font-medium text-slate-900 truncate">{user?.first_name} {user?.last_name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>
                      {user?.role === 'MERCHANT' && (
                        <>
                          <div className="px-4 py-1.5 text-xs font-semibold text-amber-600 bg-amber-50 mx-2 rounded mb-2 text-center">
                            MERCHANT
                          </div>
                          <Link
                            to="/merchant/products/new"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Add Product
                          </Link>
                          <Link
                            to="/merchant/products"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            My Products
                          </Link>
                          <Link
                            to="/merchant/orders"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Merchant Orders
                          </Link>
                        </>
                      )}
                      <Link
                        to="/profile"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        My Profile
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        My Orders
                      </Link>
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <Link to="/login" className="text-xs sm:text-sm font-medium text-slate-600 hover:text-indigo-600 px-2 py-1">
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent rounded-lg shadow-sm text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar Expansion (Popped below navbar and above page filters) */}
        {isMobileSearchOpen && (
          <div className="md:hidden border-t border-slate-200 bg-slate-50/95 backdrop-blur-sm px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-indigo-500" />
              </div>
              <input
                type="text"
                autoFocus
                className="block w-full pl-9 pr-8 py-2.5 border border-slate-300 rounded-xl text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-inner"
                placeholder="Search products, brands, categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 250)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mobile Autocomplete Suggestions Dropdown */}
            {isFocused && (suggestions.length > 0 || (!debouncedSearchTerm && history.length > 0)) && (
              <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <ul className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {suggestions.length > 0 ? (
                    suggestions.map((suggestion, index) => (
                      <li key={index}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex justify-between items-center text-xs text-slate-700"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <span>{suggestion.query}</span>
                          <span className="text-[10px] text-slate-400">Suggestion</span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 bg-slate-50">Recent Searches</li>
                      {history.map((item, index) => (
                        <li key={`mobile-hist-${index}`}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex justify-between items-center text-xs text-slate-700"
                            onClick={() => handleSuggestionClick(item)}
                          >
                            <span>{item.query}</span>
                            <span className="text-[10px] text-slate-400">History</span>
                          </button>
                        </li>
                      ))}
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </nav>
      <CartDrawer isOpen={isCartOpen} setIsOpen={setIsCartOpen} />
    </>
  );
}
