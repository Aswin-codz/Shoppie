import { Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, ShoppingBag } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCart } from '../../features/cart/cartSlice';
import CartItem from './CartItem';
import { Link } from 'react-router-dom';

export default function CartDrawer({ isOpen, setIsOpen }) {
  const dispatch = useDispatch();
  const { items, subtotal, status, itemCount } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isOpen && isAuthenticated && status === 'idle') {
      dispatch(fetchCart());
    }
  }, [isOpen, isAuthenticated, status, dispatch]);

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={setIsOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300 sm:duration-500"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300 sm:duration-500"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    <div className="flex items-center justify-between px-4 py-6 sm:px-6">
                      <Dialog.Title className="text-lg font-medium text-slate-900 flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5" /> Shopping Cart ({itemCount})
                      </Dialog.Title>
                      <div className="ml-3 flex h-7 items-center">
                        <button
                          type="button"
                          className="relative -m-2 p-2 text-slate-400 hover:text-slate-500"
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="absolute -inset-0.5" />
                          <span className="sr-only">Close panel</span>
                          <X className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                      {status === 'loading' && items.length === 0 ? (
                        <div className="flex justify-center items-center h-full">
                          <span className="text-slate-500">Loading cart...</span>
                        </div>
                      ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                            <ShoppingBag className="h-8 w-8 text-slate-400" />
                          </div>
                          <p className="text-lg font-medium text-slate-900">Your cart is empty</p>
                          <p className="text-slate-500 max-w-xs">Looks like you haven't added anything to your cart yet.</p>
                          <button
                            onClick={() => setIsOpen(false)}
                            className="mt-6 font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            Continue Shopping &rarr;
                          </button>
                        </div>
                      ) : (
                        <div className="mt-8">
                          <div className="flow-root">
                            <ul role="list" className="-my-6 divide-y divide-slate-200">
                              {items.map((item) => (
                                <CartItem key={item.product.id} item={item} />
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    {items.length > 0 && (
                      <div className="border-t border-slate-200 px-4 py-6 sm:px-6 bg-slate-50">
                        <div className="flex justify-between text-base font-bold text-slate-900 mb-2">
                          <p>Subtotal</p>
                          <p>₹{subtotal}</p>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500 mb-6">
                          Shipping and taxes calculated at checkout.
                        </p>
                        <div className="mt-6 flex flex-col space-y-3">
                          <Link
                            to="/checkout"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700"
                          >
                            Checkout
                          </Link>
                          <Link
                            to="/cart"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                          >
                            View Cart
                          </Link>
                        </div>
                        <div className="mt-6 flex justify-center text-center text-sm text-slate-500">
                          <p>
                            or{' '}
                            <button
                              type="button"
                              className="font-medium text-indigo-600 hover:text-indigo-500"
                              onClick={() => setIsOpen(false)}
                            >
                              Continue Shopping
                              <span aria-hidden="true"> &rarr;</span>
                            </button>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
