import { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { uploadProductImage, deleteProductImage, reorderProductImages, setPrimaryProductImage, fetchMerchantProductDetails } from '../catalogSlice';
import { FiUploadCloud, FiTrash2, FiStar, FiMove } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const ProductImageManager = ({ product }) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Fallback to empty array if product images are missing
  const images = product?.images || [];
  const maxImages = 8;
  const canUpload = images.length < maxImages;

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (images.length + files.length > maxImages) {
      toast.error(`You can only have up to ${maxImages} images.`);
      return;
    }

    setUploading(true);
    setProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        await dispatch(uploadProductImage({
          productId: product.id,
          formData,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // Rough progress calculation across multiple files
            setProgress(((i * 100) + percentCompleted) / files.length);
          }
        })).unwrap();
        toast.success(`Uploaded ${file.name}`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}: ${error}`);
      }
    }
    
    setUploading(false);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Re-fetch product details to get correct order and primary status from backend if needed,
    // though the reducer handles simple cases.
    dispatch(fetchMerchantProductDetails(product.id));
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    try {
      await dispatch(deleteProductImage({ productId: product.id, imageId })).unwrap();
      toast.success("Image deleted");
      dispatch(fetchMerchantProductDetails(product.id));
    } catch (error) {
      toast.error(error.toString());
    }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      await dispatch(setPrimaryProductImage({ productId: product.id, imageId })).unwrap();
      toast.success("Primary image updated");
    } catch (error) {
      toast.error(error.toString());
    }
  };

  // Simple drag-and-drop state
  const [draggedItem, setDraggedItem] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;
    
    // Optimistic UI update could go here, but for simplicity we'll just wait for drop
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === targetIndex) return;

    const newImages = [...images];
    const item = newImages.splice(draggedItem, 1)[0];
    newImages.splice(targetIndex, 0, item);

    const imageIds = newImages.map(img => img.id);
    
    try {
      await dispatch(reorderProductImages({ productId: product.id, imageIds })).unwrap();
      toast.success("Images reordered");
    } catch (error) {
      toast.error(error.toString());
    }
    
    setDraggedItem(null);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Product Media</h2>
          <p className="text-sm text-gray-500">Manage up to {maxImages} images. Drag to reorder.</p>
        </div>
        <div>
          <input 
            type="file" 
            multiple 
            accept="image/jpeg,image/png,image/webp" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={!canUpload || uploading}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={!canUpload || uploading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              canUpload && !uploading
                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <FiUploadCloud className="w-4 h-4" />
            <span>Upload Images</span>
          </button>
        </div>
      </div>

      {uploading && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1 text-gray-600">
            <span>Uploading...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-500">
          <FiUploadCloud className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p>No images uploaded yet.</p>
          <p className="text-sm mt-1">Upload JPEG, PNG, or WebP (max 5MB)</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div 
              key={image.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              className="group relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 aspect-square cursor-move transition-all hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2"
            >
              <img 
                src={image.image_url} 
                alt={image.alt_text || 'Product'} 
                className="w-full h-full object-cover"
              />
              
              {/* Overlays */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-between">
                  {image.is_primary ? (
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-md flex items-center">
                      <FiStar className="w-3 h-3 mr-1" /> Primary
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleSetPrimary(image.id)}
                      className="bg-white text-gray-700 hover:text-yellow-600 text-xs font-medium px-2 py-1 rounded-md shadow-sm transition-colors"
                    >
                      Make Primary
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(image.id)}
                    className="p-1.5 bg-white text-gray-700 hover:text-red-600 rounded-md shadow-sm transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-center text-white pb-1">
                  <FiMove className="w-5 h-5 mx-auto opacity-75" />
                </div>
              </div>
              
              {/* Persistent Primary Badge for inactive state */}
              {image.is_primary && (
                <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-md flex items-center group-hover:hidden">
                  <FiStar className="w-3 h-3 mr-1" /> Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageManager;
