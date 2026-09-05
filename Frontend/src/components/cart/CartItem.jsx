import { useDispatch } from 'react-redux';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { updateCartItem, removeCartItem } from '../../features/cart/cartSlice';
import { Link } from 'react-router-dom';

export default function CartItem({ item }) {
  const dispatch = useDispatch();
  
  const handleUpdateQuantity = (newQuantity) => {
    if (newQuantity > 0 && newQuantity <= 99) {
      dispatch(updateCartItem({ itemId: item.id, quantity: newQuantity, productId: item.product.id }));
    }
  };

  const handleRemove = () => {
    dispatch(removeCartItem({ itemId: item.id, productId: item.product.id }));
  };

  const defaultImage = "https://via.placeholder.com/150?text=No+Image";

  return (
    <div className="flex py-4 border-b border-slate-100">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center">
        <img
          src={item.product.primary_image || defaultImage}
          alt={item.product.name}
          className="h-full w-full object-contain object-center"
        />
      </div>

      <div className="ml-4 flex flex-1 flex-col">
        <div>
          <div className="flex justify-between text-sm font-medium text-slate-900">
            <h3 className="line-clamp-1">
              <Link to={`/products/${item.product.slug}`}>{item.product.name}</Link>
            </h3>
            <p className="ml-4 font-bold">₹{Number(item.product.price * item.quantity).toFixed(2)}</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">₹{Number(item.product.price).toFixed(2)} each</p>
        </div>
        <div className="flex flex-1 items-end justify-between text-sm">
          <div className="flex items-center border border-slate-200 rounded-md">
            <button
              onClick={() => handleUpdateQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 font-medium text-slate-900 border-x border-slate-200 w-10 text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => handleUpdateQuantity(item.quantity + 1)}
              disabled={item.quantity >= 99}
              className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex">
            <button
              type="button"
              onClick={handleRemove}
              className="font-medium text-indigo-600 hover:text-indigo-500 p-1"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
