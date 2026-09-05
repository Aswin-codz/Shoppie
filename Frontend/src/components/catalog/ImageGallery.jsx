import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImageGallery({ images, productName }) {
  const defaultImage = "https://via.placeholder.com/600x600?text=No+Image";
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200">
        <span className="text-slate-400 text-sm">No images available</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image Container */}
      <div className="w-full aspect-square bg-white rounded-2xl overflow-hidden relative border border-slate-200/90 shadow-sm p-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            src={images[currentIndex].image_url || images[currentIndex].image || defaultImage}
            alt={images[currentIndex].alt_text || productName}
            className="w-full h-full object-contain object-center"
          />
        </AnimatePresence>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
          {images.map((image, index) => (
            <button
              key={image.id || index}
              onClick={() => setCurrentIndex(index)}
              className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all p-1 bg-white ${
                currentIndex === index 
                  ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-sm' 
                  : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300'
              }`}
            >
              <img
                src={image.image_url || image.image || defaultImage}
                alt={image.alt_text || `Thumbnail ${index + 1}`}
                className="w-full h-full object-contain object-center"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
