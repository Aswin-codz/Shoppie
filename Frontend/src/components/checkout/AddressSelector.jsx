import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAddresses, createAddress } from '../../features/address/addressSlice';
import { Plus, CheckCircle } from 'lucide-react';

const AddressSelector = ({ selectedAddressId, onSelectAddress }) => {
    const dispatch = useDispatch();
    const { addresses, loading } = useSelector((state) => state.address);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
        is_default: false
    });

    useEffect(() => {
        dispatch(fetchAddresses());
    }, [dispatch]);

    useEffect(() => {
        if (!selectedAddressId && addresses.length > 0) {
            const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
            onSelectAddress(defaultAddr.id);
        }
    }, [addresses, selectedAddressId, onSelectAddress]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await dispatch(createAddress(formData)).unwrap();
            setIsAdding(false);
            onSelectAddress(res.id);
            setFormData({
                full_name: '', phone: '', address_line_1: '', address_line_2: '',
                city: '', state: '', postal_code: '', country: 'India', is_default: false
            });
        } catch (err) {
            console.error("Failed to add address", err);
        }
    };

    if (loading && addresses.length === 0) return <div>Loading addresses...</div>;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Delivery Address</h3>
            
            {addresses.length > 0 && !isAdding && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((address) => (
                        <div 
                            key={address.id} 
                            onClick={() => onSelectAddress(address.id)}
                            className={`border rounded-lg p-4 cursor-pointer relative transition-all ${selectedAddressId === address.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-gray-200 hover:border-indigo-300'}`}
                        >
                            {selectedAddressId === address.id && (
                                <CheckCircle className="absolute top-4 right-4 w-6 h-6 text-indigo-600" />
                            )}
                            <p className="font-semibold text-gray-900">{address.full_name}</p>
                            <p className="text-sm text-gray-600 mt-1">{address.address_line_1}</p>
                            {address.address_line_2 && <p className="text-sm text-gray-600">{address.address_line_2}</p>}
                            <p className="text-sm text-gray-600">{address.city}, {address.state} {address.postal_code}</p>
                            <p className="text-sm text-gray-600">{address.country}</p>
                            <p className="text-sm text-gray-600 mt-2">Phone: {address.phone}</p>
                            {address.is_default && (
                                <span className="inline-block mt-2 text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">Default</span>
                            )}
                        </div>
                    ))}
                    
                    <div 
                        onClick={() => setIsAdding(true)}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-gray-50 transition-all min-h-[160px]"
                    >
                        <Plus className="w-8 h-8 text-gray-400" />
                        <span className="mt-2 text-sm font-medium text-gray-900">Add New Address</span>
                    </div>
                </div>
            )}

            {(isAdding || addresses.length === 0) && (
                <form onSubmit={handleAddSubmit} className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Add a new address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input required type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                            <input required type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Address Line 1</label>
                            <input required type="text" name="address_line_1" value={formData.address_line_1} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Address Line 2 (Optional)</label>
                            <input type="text" name="address_line_2" value={formData.address_line_2} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">City</label>
                            <input required type="text" name="city" value={formData.city} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">State / Province</label>
                            <input required type="text" name="state" value={formData.state} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                            <input required type="text" name="postal_code" value={formData.postal_code} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Country</label>
                            <input required type="text" name="country" value={formData.country} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
                        </div>
                        <div className="md:col-span-2 flex items-center mt-2">
                            <input type="checkbox" name="is_default" checked={formData.is_default} onChange={handleInputChange} id="is_default" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                            <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">Make this my default address</label>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center justify-end space-x-3">
                        {addresses.length > 0 && (
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                Cancel
                            </button>
                        )}
                        <button type="submit" className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                            Save Address
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default AddressSelector;
