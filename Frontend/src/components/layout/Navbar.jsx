import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Search, ShoppingCart, LogOut, Package, Heart } from 'lucide-react';
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

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/');
  };

  return (
    <>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center group py-1" aria-label="Shopzy Home">
              <img
                src="/logo.png"
                alt="Shopzy"
                className="h-10 sm:h-11 w-auto max-h-12 object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-2 sm:mx-6 md:mx-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
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
          <div className="flex items-center space-x-3 sm:space-x-6">
            {/* Wishlist icon */}
            <Link to="/wishlist" className="text-slate-500 hover:text-indigo-600">
              <Heart className="h-6 w-6" />
            </Link>

            {/* Cart icon */}
            <Link 
              className="text-slate-500 hover:text-indigo-600 relative"
              to="/cart"
            >
              <ShoppingCart className="h-6 w-6" />
              {totalQuantity > 0 && (
                <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {totalQuantity}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-3 sm:space-x-6">
                <NotificationCenter />
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-slate-700 hover:text-indigo-600">
                    {user?.profile_image_url ? (
                      <img src={user.profile_image_url} alt="Profile" className="h-8 w-8 rounded-full object-cover border border-indigo-200" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                        {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                      </div>
                    )}
                  </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 w-48 mt-2 py-2 bg-white rounded-md shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="px-4 py-2 border-b border-slate-100 mb-2">
                    <p className="text-sm font-medium text-slate-900 truncate">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  {user?.role === 'MERCHANT' && (
                    <>
                        <div className="px-4 py-2 text-xs font-semibold text-amber-600 bg-amber-50 mx-2 rounded mb-2 text-center">
                          MERCHANT
                        </div>
                        <Link to="/merchant/products/new" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          Add Product
                        </Link>
                        <Link to="/merchant/products" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          My Products
                        </Link>
                        <Link to="/merchant/orders" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          Merchant Orders
                        </Link>
                    </>
                  )}
                  <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    My Profile
                  </Link>
                  <Link to="/orders" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    My Orders
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600">
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
      <CartDrawer isOpen={isCartOpen} setIsOpen={setIsCartOpen} />
    </>
  );
}
