import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchWishlist } from '../features/wishlist/wishlistSlice';
import ProductCard from '../components/catalog/ProductCard';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WishlistPage() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((state) => state.wishlist);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && status === 'idle') {
      dispatch(fetchWishlist());
    }
  }, [isAuthenticated, status, dispatch]);

  if (!isAuthenticated) {
    return (
      <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-24 text-center">
        <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-rose-50 mb-6">
          <Heart className="h-12 w-12 text-rose-300" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-4">Save your favorite items</h2>
        <p className="text-lg text-slate-500 mb-8 max-w-md mx-auto">
          Want to save the items that you love? Just click on the heart symbol beside the item and it will show up here.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl border border-transparent bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-8 py-3 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'loading' && items.length === 0) {
    return (
      <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-16 flex justify-center">
        <p className="text-lg text-slate-500">Loading wishlist...</p>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-[60vh]">
      <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-10">
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Your Wishlist</h2>
            <p className="text-sm text-slate-500 mt-1">Saved items you want to keep an eye on</p>
          </div>
          <span className="text-sm font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-slate-100 mb-6">
              <Heart className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-medium text-slate-900 mb-2">Your wishlist is empty</h3>
            <p className="text-slate-500 mb-8">Save items you love to your wishlist and buy them later.</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ProductCard key={item.product.id} product={item.product} intelligence={item.intelligence} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
