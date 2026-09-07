import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Package, Upload, Plus, X, Loader2 } from 'lucide-react';
import { uploadProductImage, fetchCategories } from '../features/catalog/catalogSlice';
import DescriptionBuilder from '../components/catalog/DescriptionBuilder';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

export default function MerchantAddProductPage() {
    const navigate = useNavigate();
    const { slug } = useParams();
    const isEditMode = Boolean(slug);
    
    const dispatch = useDispatch();
    const { categories, status: catStatus } = useSelector((state) => state.catalog);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [existingImages, setExistingImages] = useState([]);
    const [editingId, setEditingId] = useState(null);

    // Fetch categories if not loaded
    useEffect(() => {
        if (catStatus === 'idle') {
            dispatch(fetchCategories());
        }
    }, [catStatus, dispatch]);

    const [form, setForm] = useState({
        name: '',
        description: '',
        price: '',
        compare_at_price: '',
        stock_quantity: 0,
        sku: '',
        category: '',
        tags: '',
        is_active: true
    });
    
    // Fetch product if edit mode
    useEffect(() => {
        if (isEditMode) {
            const fetchProduct = async () => {
                try {
                    const res = await axiosClient.get(`/catalog/products/${slug}/`);
                    const prod = res.data;
                    setEditingId(prod.id);
                    setForm({
                        name: prod.name || '',
                        description: prod.description || '',
                        price: prod.price || '',
                        compare_at_price: prod.compare_at_price || '',
                        stock_quantity: prod.stock_quantity || 0,
                        sku: prod.sku || '',
                        category: prod.category?.id || prod.category || '',
                        tags: prod.tags ? prod.tags.map(t => t.name).join(', ') : '',
                        is_active: prod.is_active
                    });
                    setExistingImages(prod.images || []);
                } catch (err) {
                    toast.error("Failed to load product details.");
                }
            };
            fetchProduct();
        }
    }, [isEditMode, slug]);

    // For handling on-the-fly category creation
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);

    const [images, setImages] = useState([]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    };

    const handleImageChange = (e) => {
        if (e.target.files) {
            setImages(Array.from(e.target.files));
        }
    };

    const handleDeleteExistingImage = async (imageId) => {
        if (!editingId) return;
        if (!window.confirm("Are you sure you want to delete this image?")) return;
        try {
            await axiosClient.delete(`/catalog/merchant/products/${editingId}/images/${imageId}/`);
            setExistingImages(prev => prev.filter(img => img.id !== imageId));
            toast.success("Image deleted successfully");
        } catch (err) {
            toast.error("Failed to delete image");
        }
    };
    
    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        setIsCreatingCategory(true);
        try {
            const res = await axiosClient.post('/catalog/categories/', {
                name: newCategoryName.trim(),
                is_active: true
            });
            dispatch(fetchCategories()); // Refresh categories
            setForm({ ...form, category: res.data.id });
            setNewCategoryName('');
            toast.success('Category created successfully!');
        } catch (error) {
            toast.error('Failed to create category');
        } finally {
            setIsCreatingCategory(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // 1. Create Product
            const productPayload = {
                ...form,
                tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                compare_at_price: form.compare_at_price || null,
            };
            if (!productPayload.sku) {
                delete productPayload.sku;
            }
            
            let productId;
            if (isEditMode && editingId) {
                const res = await axiosClient.put(`/catalog/merchant/products/${editingId}/`, productPayload);
                productId = res.data.id;
            } else {
                const productRes = await axiosClient.post('/catalog/merchant/products/', productPayload);
                productId = productRes.data.id;
            }
            
            // 2. Upload Images
            if (images.length > 0) {
                setIsUploading(true);
                for (let i = 0; i < images.length; i++) {
                    const formData = new FormData();
                    formData.append('image', images[i]);
                    formData.append('alt_text', `${productPayload.name} - Image ${i + 1}`);
                    if (i === 0) formData.append('is_primary', 'true');
                    
                    try {
                        await axiosClient.post(`/catalog/merchant/products/${productId}/images/`, formData, {
                            headers: {
                                'Content-Type': undefined
                            }
                        });
                    } catch (imgError) {
                        toast.error(`Failed to upload image ${i + 1}`);
                    }
                }
            }
            
            toast.success('Product added successfully!');
            navigate('/merchant/products');
        } catch (error) {
            console.error('Error adding product:', error);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to add product. Please try again.';
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-10">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight flex items-center gap-2">
                        <Package className="h-8 w-8 text-indigo-600" />
                        {isEditMode ? 'Edit Product' : 'Add New Product'}
                    </h2>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-2xl md:col-span-2 p-4 sm:p-6 md:p-8">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:gap-y-8 sm:grid-cols-6">
                        
                        <div className="col-span-full">
                            <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2">
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    required
                                    value={form.name}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                />
                            </div>
                        </div>

                        <div className="col-span-full">
                            <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                                Rich Description
                            </label>
                            <DescriptionBuilder 
                                description={form.description}
                                onChange={(val) => setForm(prev => ({ ...prev, description: val }))}
                            />
                        </div>

                        <div className="sm:col-span-2 sm:col-start-1">
                            <label htmlFor="price" className="block text-sm font-medium leading-6 text-gray-900">
                                Price (₹) <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2">
                                <input
                                    type="number"
                                    name="price"
                                    id="price"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={form.price}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="compare_at_price" className="block text-sm font-medium leading-6 text-gray-900">
                                Compare at price (₹)
                            </label>
                            <div className="mt-2">
                                <input
                                    type="number"
                                    name="compare_at_price"
                                    id="compare_at_price"
                                    step="0.01"
                                    min="0"
                                    value={form.compare_at_price}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                />
                            </div>
                        </div>
                        
                        <div className="sm:col-span-2">
                            <label htmlFor="stock_quantity" className="block text-sm font-medium leading-6 text-gray-900">
                                Stock Quantity <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2">
                                <input
                                    type="number"
                                    name="stock_quantity"
                                    id="stock_quantity"
                                    min="0"
                                    required
                                    value={form.stock_quantity}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                />
                            </div>
                        </div>
                        
                        <div className="col-span-full border-t border-gray-200 pt-6 mt-2">
                            <label htmlFor="category" className="block text-sm font-medium leading-6 text-gray-900">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <select
                                    id="category"
                                    name="category"
                                    required
                                    value={form.category}
                                    onChange={handleChange}
                                    className="block w-full sm:max-w-xs rounded-xl border border-gray-300 py-2.5 text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-600 sm:text-sm px-3 bg-white"
                                >
                                    <option value="">Select a category</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                
                                <div className="flex flex-1 items-center gap-2">
                                    <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">or Add New:</span>
                                    <input 
                                        type="text"
                                        placeholder="New category name..."
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="block w-full rounded-xl border border-gray-300 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm px-3"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCreateCategory}
                                        disabled={isCreatingCategory || !newCategoryName.trim()}
                                        className="rounded-xl bg-indigo-50 text-indigo-600 px-3.5 py-2 text-sm font-semibold shadow-sm hover:bg-indigo-100 disabled:opacity-50 flex items-center justify-center flex-shrink-0"
                                        title="Create category"
                                    >
                                        {isCreatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-full">
                            <label htmlFor="tags" className="block text-sm font-medium leading-6 text-gray-900">
                                Tags (comma separated)
                            </label>
                            <div className="mt-2">
                                <input
                                    type="text"
                                    name="tags"
                                    id="tags"
                                    placeholder="electronics, gadgets, new"
                                    value={form.tags}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                />
                            </div>
                        </div>
                        
                        <div className="col-span-full border-t border-gray-200 pt-6 mt-2">
                            <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                                Product Images
                            </label>

                            {/* Existing Images (Edit Mode) */}
                            {isEditMode && existingImages.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Current Uploaded Images ({existingImages.length})
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                        {existingImages.map((img) => (
                                            <div key={img.id} className="relative group rounded-xl border border-gray-200 bg-white p-2 shadow-sm overflow-hidden aspect-square flex items-center justify-center">
                                                <img 
                                                    src={img.image_url || img.image} 
                                                    alt="Current Product" 
                                                    className="w-full h-full object-contain"
                                                />
                                                {img.is_primary && (
                                                    <span className="absolute bottom-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                                                        Primary
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    title="Delete this image"
                                                    onClick={() => handleDeleteExistingImage(img.id)}
                                                    className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition hover:bg-red-700"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Upload New Images */}
                            <div className="flex items-center justify-center w-full">
                                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-44 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-indigo-50/50 hover:border-indigo-400 transition">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                                        <p className="mb-2 text-sm text-gray-600"><span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-gray-500">PNG, JPG or WebP (Will be safely uploaded to Cloudinary)</p>
                                    </div>
                                    <input 
                                        id="dropzone-file" 
                                        type="file" 
                                        className="hidden" 
                                        multiple
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                </label>
                            </div>
                            
                            {/* New Previews */}
                            {images.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        New Images to Upload ({images.length})
                                    </h4>
                                    <div className="flex flex-wrap gap-4">
                                        {images.map((img, idx) => (
                                            <div key={idx} className="relative group w-24 h-24 rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white p-1.5 flex items-center justify-center">
                                                <img 
                                                    src={URL.createObjectURL(img)} 
                                                    alt="preview" 
                                                    className="w-full h-full object-contain"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                <div className="flex items-center justify-end gap-x-6">
                    <button type="button" onClick={() => navigate(-1)} className="text-sm font-semibold leading-6 text-gray-900">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || isUploading}
                        className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {(isLoading || isUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isUploading ? 'Uploading images...' : isLoading ? 'Saving...' : 'Save Product'}
                    </button>
                </div>
            </form>
        </div>
    );
}
