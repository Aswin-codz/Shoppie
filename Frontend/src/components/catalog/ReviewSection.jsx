import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { Star, CheckCircle, Flag, X, ThumbsUp, MessageSquare } from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';

export default function ReviewSection({ productSlug }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector(state => state.auth);
  
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Reporting state
  const [reportingReviewId, setReportingReviewId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productSlug]);

  const fetchReviews = async () => {
    try {
      const res = await axiosClient.get(`/catalog/products/${productSlug}/reviews/`);
      setReviews(res.data);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error("Please login to review.");
    
    setSubmitting(true);
    const images = imageUrls.split(',').map(url => url.trim()).filter(url => url.length > 0);
    
    try {
      await axiosClient.post(`/catalog/products/${productSlug}/reviews/`, {
        rating,
        title,
        comment,
        images
      });
      toast.success("Review submitted!");
      setShowForm(false);
      setComment('');
      setTitle('');
      setImageUrls('');
      setRating(5);
      fetchReviews();
    } catch (err) {
      if (err.response?.data?.detail) {
        toast.error(err.response.data.detail);
      } else {
        toast.error("Failed to submit review.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteHelpful = async (reviewId) => {
    if (!user) return toast.error("Please login to vote.");
    try {
      const res = await axiosClient.post(`/catalog/products/${productSlug}/reviews/${reviewId}/vote_helpful/`);
      toast.success(res.data.detail);
      setReviews(reviews.map(r => r.id === reviewId ? { ...r, helpful_count: res.data.helpful_count } : r));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to vote.");
    }
  };

  const hasReviewed = user && Array.isArray(reviews) && reviews.some(r => r.user === user?.id);

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading reviews...</div>;
  }

  const handleReport = async (e) => {
    e.preventDefault();
    if (!user) return toast.error("Please login to report a review.");
    if (!reportReason) return toast.error("Reason is required.");

    setIsReporting(true);
    try {
      await axiosClient.post(`/catalog/products/${productSlug}/reviews/${reportingReviewId}/report/`, {
        reason: reportReason,
        notes: reportNotes
      });
      toast.success("Review reported successfully.");
      setReportingReviewId(null);
      setReportReason('');
      setReportNotes('');
    } catch (err) {
      if (err.response?.data?.detail) {
        toast.error(err.response.data.detail);
      } else {
        toast.error("Failed to report review.");
      }
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="mt-16" id="reviews">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Customer Reviews</h2>
      
      {/* Review Form Toggle */}
      {!hasReviewed && user && !showForm && (
        <button 
          onClick={() => setShowForm(true)}
          className="mb-8 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
        >
          Write a Review
        </button>
      )}

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-10 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Write a Review</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              <div className="flex gap-1 h-10 items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-7 h-7 cursor-pointer transition-colors ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Summarize your review"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
            <textarea
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="What did you like or dislike?"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URLs (comma separated)</label>
            <input
              type="text"
              value={imageUrls}
              onChange={(e) => setImageUrls(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
            />
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-8">
        {!Array.isArray(reviews) || reviews.length === 0 ? (
          <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-gray-100">No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="border-b border-gray-200 pb-8 last:border-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center flex-wrap gap-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  {review.title && <h4 className="text-base font-semibold text-gray-900 ml-2">{review.title}</h4>}
                </div>
                {user && user.id !== review.user && (
                  <button
                    onClick={() => setReportingReviewId(review.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Report Review"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 mb-3 text-sm">
                <span className="font-medium text-gray-700">{review.user_name}</span>
                {review.is_verified_purchase && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="w-3 h-3" />
                    Verified Purchase
                  </span>
                )}
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
              <div className="mt-3 text-gray-700 leading-relaxed">
                {review.comment}
              </div>
              
              {review.images && review.images.length > 0 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {review.images.map(img => (
                    <img key={img.id} src={img.image_url} alt="Review" className="w-24 h-24 object-cover rounded-md border border-gray-200" />
                  ))}
                </div>
              )}
              
              <div className="mt-4 flex items-center gap-4">
                <button 
                  onClick={() => handleVoteHelpful(review.id)}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Helpful ({review.helpful_count || 0})
                </button>
              </div>

              {review.merchant_response && (
                <div className="mt-5 ml-4 pl-4 border-l-2 border-indigo-200 bg-indigo-50/50 p-4 rounded-r-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-900">Response from Merchant</span>
                    <span className="text-xs text-indigo-400 ml-auto">
                      {review.merchant_response_at && new Date(review.merchant_response_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-indigo-800">{review.merchant_response}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Report Modal */}
      {reportingReviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900">Report Review</h3>
              <button onClick={() => setReportingReviewId(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReport} className="p-6">
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason for reporting</label>
                <select
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Select a reason...</option>
                  <option value="SPAM">Spam or fake</option>
                  <option value="ABUSIVE">Abusive or offensive</option>
                  <option value="OFF_TOPIC">Off-topic</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500"
                  placeholder="Provide any additional details..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setReportingReviewId(null)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReporting}
                  className="px-5 py-2.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isReporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
