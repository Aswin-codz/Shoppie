import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createAddress } from '../features/address/addressSlice';
import { toast } from 'react-hot-toast';
import { MapPin, ArrowLeft } from 'lucide-react';

export default function AddAddressPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone || !form.address_line_1 || !form.city || !form.state || !form.postal_code) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await dispatch(createAddress(form)).unwrap();
      toast.success('Address added successfully!');
      navigate('/profile');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to add address.');
    } finally {
      setSubmitting(false);
    }
  };

  const [detectingLocation, setDetectingLocation] = useState(false);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            const road = addr.road || addr.suburb || addr.neighbourhood || '';
            const house = addr.house_number || '';
            setForm(prev => ({
              ...prev,
              address_line_1: `${house} ${road}`.trim() || data.display_name.split(',')[0] || '',
              city: addr.city || addr.town || addr.village || addr.county || '',
              state: addr.state || '',
              postal_code: addr.postcode || '',
              country: addr.country || 'India',
            }));
            toast.success('Location detected via OpenStreetMap!');
          } else {
            toast.error('Could not resolve address details.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to get address from OpenStreetMap.');
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        console.error(error);
        toast.error('Unable to retrieve your location. Please check browser permissions.');
        setDetectingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Add New Address</h1>
              <p className="text-sm text-slate-500">Fill in your delivery address below</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={detectingLocation}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
          >
            <MapPin className="w-4 h-4 text-indigo-600" />
            {detectingLocation ? 'Detecting...' : 'Detect via OpenStreetMap'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input
                type="text" name="full_name" value={form.full_name} onChange={handleChange} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
              <input
                type="tel" name="phone" value={form.phone} onChange={handleChange} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1 *</label>
            <input
              type="text" name="address_line_1" value={form.address_line_1} onChange={handleChange} required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              placeholder="House/Flat No., Street Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
            <input
              type="text" name="address_line_2" value={form.address_line_2} onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              placeholder="Landmark, Area (optional)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
              <input
                type="text" name="city" value={form.city} onChange={handleChange} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
              <input
                type="text" name="state" value={form.state} onChange={handleChange} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                placeholder="State"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code *</label>
              <input
                type="text" name="postal_code" value={form.postal_code} onChange={handleChange} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                placeholder="560001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
            <input
              type="text" name="country" value={form.country} onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox" name="is_default" checked={form.is_default} onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
            />
            <label className="text-sm text-slate-700">Set as default address</label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-6 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Save Address'}
          </button>
        </form>
      </div>
    </div>
  );
}
