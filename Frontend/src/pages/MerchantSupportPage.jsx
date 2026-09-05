import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { toast } from 'react-hot-toast';
import { Ticket, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const MerchantSupportPage = () => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchIssues = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/orders/support-issues/');
            setIssues(Array.isArray(res.data) ? res.data : (res.data?.results || []));
        } catch (err) {
            toast.error("Failed to load support issues.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, []);

    const handleResolve = async (id) => {
        if (!window.confirm("Mark this issue as resolved?")) return;
        try {
            await axiosClient.patch(`/orders/support-issues/${id}/`, {
                status: 'RESOLVED'
            });
            toast.success("Issue resolved.");
            fetchIssues();
        } catch (err) {
            toast.error("Failed to resolve issue.");
        }
    };

    if (loading && issues.length === 0) {
        return <div className="max-w-7xl mx-auto px-4 py-16 text-center">Loading issues...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-8">Support Tickets</h1>

            {issues.length === 0 ? (
                <div className="text-center bg-white p-12 border border-gray-200 rounded-lg shadow-sm">
                    <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No open support tickets</h3>
                    <p className="mt-2 text-gray-500">You're all caught up!</p>
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {issues.map((issue) => (
                            <li key={issue.id} className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${issue.status === 'RESOLVED' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                            <Ticket className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-lg font-bold text-gray-900">Issue #{issue.id}</h4>
                                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    {issue.category}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                {new Date(issue.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold leading-5 ${
                                            issue.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : 
                                            issue.status === 'OPEN' ? 'bg-red-100 text-red-800' : 
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {issue.status}
                                        </span>
                                        {issue.status !== 'RESOLVED' && (
                                            <button 
                                                onClick={() => handleResolve(issue.id)}
                                                className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                                            >
                                                Mark Resolved
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 bg-gray-50 p-4 rounded border border-gray-100 text-gray-700 text-sm">
                                    {issue.description}
                                </div>
                                {(issue.order || issue.product) && (
                                    <div className="mt-4 flex gap-4 text-sm text-gray-500">
                                        {issue.order && <span>Order ID: {issue.order}</span>}
                                        {issue.product && <span>Product ID: {issue.product}</span>}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default MerchantSupportPage;
