import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function MerchantRoute({ children }) {
    const { user, isAuthenticated, isLoading } = useSelector((state) => state.auth);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'MERCHANT') {
        return <Navigate to="/" replace />;
    }

    return children;
}
