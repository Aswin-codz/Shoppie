import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchAddresses, deleteAddress } from '../features/address/addressSlice';
import { fetchCurrentUser } from '../features/auth/authSlice';
import { authApi } from '../features/auth/authApi';
import { 
  User, MapPin, Trash2, Plus, Package, ShoppingBag, 
  Phone, Mail, Edit3, X, Check, Loader2, ShieldCheck 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { fetchPreferences, updatePreferences } from '../features/notifications/notificationSlice';
import axiosClient from '../api/axiosClient';

export default function UserProfilePage() {
  const { user } = useSelector((state) => state.auth);
  const { addresses, loading: addressLoading } = useSelector((state) => state.address);
  const dispatch = useDispatch();

  const { preferences } = useSelector((state) => state.notifications);
  const [merchantStats, setMerchantStats] = useState(null);

  // Edit Profile Modal State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    dispatch(fetchAddresses());
    dispatch(fetchPreferences());
    
    if (user?.role === 'MERCHANT') {
      axiosClient.get('/orders/orders/merchant/analytics/')
        .then(res => setMerchantStats(res.data))
        .catch(err => console.error("Failed to load merchant stats", err));
    }
  }, [dispatch, user]);

  const openEditModal = () => {
    setProfileForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone_number: user?.phone_number || '',
    });
    setIsEditingProfile(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await authApi.updateMe({
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        phone_number: profileForm.phone_number.trim(),
      });
      await dispatch(fetchCurrentUser()).unwrap();
      toast.success('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (err) {
      const msg = err.response?.data?.phone_number?.[0] || 
                  err.response?.data?.detail || 
                  'Failed to update profile. Please try again.';
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await dispatch(deleteAddress(id)).unwrap();
      toast.success('Address deleted');
    } catch (err) {
      toast.error('Failed to delete address');
    }
  };

  const handlePreferenceChange = (key, value) => {
    const updated = { ...preferences, [key]: value };
    dispatch(updatePreferences(updated));
    toast.success('Preference updated');
  };

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username;

  return (
    <div className="w-full px-3.5 sm:px-8 lg:px-14 xl:px-16 py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Account & Profile</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">Manage your personal information, contact details, and shipping addresses</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* User Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 p-5 sm:p-6 md:p-8">
            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
              <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 mb-4 overflow-hidden">
                {user?.profile_image_url ? (
                  <img src={user.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black uppercase">
                    {(user?.first_name?.[0] || user?.username?.[0] || 'U')}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{fullName}</h2>
              <p className="text-sm text-slate-500 font-medium">{user?.username}</p>
              
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                <ShieldCheck className="w-3.5 h-3.5" />
                {user?.role || 'Customer'}
              </div>
            </div>
            
            {/* Contact details */}
            <div className="py-5 space-y-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-[11px] text-slate-600 uppercase font-semibold">Email</p>
                  <p className="text-slate-800 font-medium truncate">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-600 uppercase font-semibold">Mobile Number</p>
                  <p className={`font-medium ${user?.phone_number ? 'text-slate-800' : 'text-slate-500 italic'}`}>
                    {user?.phone_number || 'No phone added'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={openEditModal}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/70 font-semibold text-sm transition"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile Info
              </button>
            </div>

            {/* Merchant Quick Analytics */}
            {user?.role === 'MERCHANT' && merchantStats && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Merchant Stats</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
                    <Package className="h-5 w-5 text-indigo-600 mb-1" />
                    <span className="text-xl font-black text-slate-800">{merchantStats.total_products || 0}</span>
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Products</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
                    <ShoppingBag className="h-5 w-5 text-emerald-600 mb-1" />
                    <span className="text-xl font-black text-slate-800">{merchantStats.total_orders || 0}</span>
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Orders</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Column: Addresses & Preferences */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 p-5 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">Saved Addresses</h2>
                  <p className="text-xs text-slate-500">Shipping addresses used during checkout</p>
                </div>
              </div>
              <Link to="/address/add" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition self-start sm:self-auto">
                <Plus className="w-4 h-4" />
                Add Address
              </Link>
            </div>
            
            {addressLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : (!Array.isArray(addresses) || addresses.length === 0) ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 font-medium text-sm">You haven't saved any addresses yet.</p>
                <p className="text-slate-600 text-xs mt-0.5">Add an address to speed up future checkouts.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(Array.isArray(addresses) ? addresses : (addresses?.results || [])).map((address) => (
                  <div key={address.id} className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 relative group hover:border-indigo-300 hover:shadow-sm transition bg-slate-50/40">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-bold text-slate-900 text-sm">{address.full_name}</h3>
                      {address.is_default && (
                        <span className="shrink-0 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {address.address_line_1}{address.address_line_2 && `, ${address.address_line_2}`}
                    </p>
                    <p className="text-xs text-slate-600">{address.city}, {address.state} {address.postal_code}</p>
                    <p className="text-xs text-slate-600">{address.country}</p>
                    {address.phone && (
                      <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {address.phone}
                      </p>
                    )}
                    
                    <button 
                      onClick={() => handleDeleteAddress(address.id)}
                      className="mt-4 text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Address
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 p-5 sm:p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Notification Preferences</h2>
            <p className="text-xs text-slate-500 mb-6">Choose what updates you want to receive</p>
            {preferences ? (
              <div className="space-y-4">
                {Object.entries(preferences).map(([key, value]) => {
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  return (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={value}
                          onChange={(e) => handlePreferenceChange(key, e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Loading preferences...</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
              <button 
                onClick={() => setIsEditingProfile(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile / Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={profileForm.phone_number}
                    onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                    className="w-full pl-10 rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
                    placeholder="+91 9876543210"
                  />
                </div>
                <p className="text-[11px] text-slate-600 mt-1">Used for order tracking, SMS alerts, and delivery communications.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 transition disabled:opacity-50"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
