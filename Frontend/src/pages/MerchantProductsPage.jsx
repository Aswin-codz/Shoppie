import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Package, Edit2, Plus, DollarSign, Tag, Search, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import { fetchCategories } from '../features/catalog/catalogSlice';
import DescriptionBuilder from '../components/catalog/DescriptionBuilder';

export default function MerchantProductsPage() {
    const dispatch = useDispatch();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Delete Confirmation State
    const [deletingProduct, setDeletingProduct] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Edit Modal State
    const [editingProduct, setEditingProduct] = useState(null);
    const [editForm, setEditForm] = useState({
        price: '',
        compare_at_price: '',
        stock_quantity: '',
        description: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        dispatch(fetchCategories());
        fetchProducts();
    }, [dispatch]);

    const fetchProducts = async (search = '') => {
        setLoading(true);
        try {
            const endpoint = search ? `/catalog/merchant/products/?search=${encodeURIComponent(search)}` : '/catalog/merchant/products/';
            const res = await axiosClient.get(endpoint);
            setProducts(res.data.results || res.data);
        } catch (err) {
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchProducts(searchQuery);
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const handleEditClick = async (product) => {
        setEditingProduct(product);
        // Initially set form with what we have
        setEditForm({
            price: product.price,
            compare_at_price: product.compare_at_price || '',
            stock_quantity: product.stock_quantity,
            description: 'Loading...',
        });
        
        try {
            // Fetch full detail to get the description which is missing in list serializer
            const res = await axiosClient.get(`/catalog/products/${product.slug}/`);
            setEditForm({
                price: product.price,
                compare_at_price: product.compare_at_price || '',
                stock_quantity: product.stock_quantity,
                description: res.data.description || '',
            });
        } catch (err) {
            toast.error("Failed to load product description");
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                price: editForm.price,
                compare_at_price: editForm.compare_at_price || null,
                stock_quantity: editForm.stock_quantity,
                description: editForm.description,
            };
            await axiosClient.patch(`/catalog/merchant/products/${editingProduct.id}/`, payload);
            toast.success("Product updated successfully");
            setEditingProduct(null);
            fetchProducts(searchQuery);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to update product");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async () => {
        if (!deletingProduct) return;
        setIsDeleting(true);
        try {
            await axiosClient.delete(`/catalog/merchant/products/${deletingProduct.id}/`);
            toast.success(`Product "${deletingProduct.name}" deleted successfully`);
            setDeletingProduct(null);
            fetchProducts(searchQuery);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to delete product");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="w-full px-3.5 sm:px-8 lg:px-14 xl:px-16 py-6 sm:py-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Package className="h-7 w-7 sm:h-8 sm:w-8 text-indigo-600" />
                        My Products
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-gray-500">Manage your product listings, stock, and pricing.</p>
                </div>
                <Link
                    to="/merchant/products/new"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add Product
                </Link>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex items-center">
                <Search className="h-5 w-5 text-gray-400 mr-3 shrink-0" />
                <input
                    type="text"
                    placeholder="Search your products by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 outline-none text-sm text-gray-900 placeholder-gray-500"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No products found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {searchQuery ? "Try adjusting your search terms." : "Get started by creating a new product listing."}
                    </p>
                </div>
            ) : (
                <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
                    {/* Mobile Card List (< md) */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {products.map((product) => (
                            <div key={product.id} className="p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="h-16 w-16 flex-shrink-0 bg-white rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center p-1 shadow-xs">
                                        {product.primary_image ? (
                                            <img className="h-full w-full object-contain" src={product.primary_image} alt="" />
                                        ) : (
                                            <Package className="h-6 w-6 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-gray-900 truncate" title={product.name}>
                                            {product.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${product.stock_quantity > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                                {product.stock_quantity} in stock
                                            </span>
                                            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md truncate">
                                                {product.category}
                                            </span>
                                        </div>
                                        <div className="mt-1.5 flex items-baseline gap-2">
                                            <span className="text-sm font-black text-gray-900">₹{Number(product.price).toFixed(2)}</span>
                                            {product.compare_at_price && (
                                                <span className="text-xs text-gray-400 line-through">₹{Number(product.compare_at_price).toFixed(2)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                                    <Link
                                        to={`/merchant/products/${product.slug}/edit`}
                                        className="flex-1 text-center text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => setDeletingProduct(product)}
                                        className="flex-1 text-center text-rose-600 bg-rose-50 hover:bg-rose-100 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {products.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-12 w-12 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center p-1">
                                                    {product.primary_image ? (
                                                        <img className="h-full w-full object-contain" src={product.primary_image} alt="" />
                                                    ) : (
                                                        <Package className="h-6 w-6 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate" title={product.name}>
                                                        {product.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {product.is_active ? (
                                                            <span className="inline-flex items-center text-emerald-600 font-medium">Active</span>
                                                        ) : (
                                                            <span className="inline-flex items-center text-red-500 font-medium">Draft / Inactive</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.stock_quantity > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                                {product.stock_quantity} in stock
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 font-bold">₹{Number(product.price).toFixed(2)}</div>
                                            {product.compare_at_price && (
                                                <div className="text-xs text-gray-500 line-through">₹{Number(product.compare_at_price).toFixed(2)}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                <Tag className="h-3 w-3" />
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/merchant/products/${product.slug}/edit`}
                                                    className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => setDeletingProduct(product)}
                                                    className="text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Quick Edit Modal */}
            {editingProduct && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setEditingProduct(null)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                            <form onSubmit={handleEditSubmit}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                            <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-5" id="modal-title">
                                                Quick Edit: <span className="text-indigo-600 truncate">{editingProduct.name}</span>
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            required
                                                            value={editForm.price}
                                                            onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Compare at Price (₹)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={editForm.compare_at_price}
                                                            onChange={(e) => setEditForm({...editForm, compare_at_price: e.target.value})}
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        required
                                                        value={editForm.stock_quantity}
                                                        onChange={(e) => setEditForm({...editForm, stock_quantity: e.target.value})}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Rich Description</label>
                                                    <DescriptionBuilder 
                                                        description={editForm.description}
                                                        onChange={(val) => setEditForm({...editForm, description: val})}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-xl border-t border-gray-200">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingProduct(null)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Product Confirmation Modal */}
            {deletingProduct && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="delete-modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm transition-opacity" onClick={() => !isDeleting && setDeletingProduct(null)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-rose-100 text-rose-600 rounded-full flex-shrink-0">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900" id="delete-modal-title">Delete Product</h3>
                                    <p className="text-xs text-gray-500">This action cannot be undone.</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                Are you sure you want to permanently delete <strong className="text-gray-900 font-semibold">{deletingProduct.name}</strong>? All associated inventory records and images will be removed.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => setDeletingProduct(null)}
                                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={handleDeleteProduct}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isDeleting ? 'Deleting...' : 'Yes, Delete Product'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
