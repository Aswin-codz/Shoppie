import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { registerUser, clearError } from '../features/auth/authSlice';

export default function RegisterPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading, error } = useSelector((state) => state.auth);

    const [form, setForm] = useState({
        user_name: '',
        email: '',
        phone_number: '',
        password: '',
        password_confirm: '',
        role: 'USER',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (error) dispatch(clearError());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const parts = form.user_name.trim().split(/\s+/);
        const first_name = parts[0] || '';
        const last_name = parts.slice(1).join(' ') || '';
        const payload = {
            ...form,
            first_name,
            last_name,
        };
        const result = await dispatch(registerUser(payload));
        if (registerUser.fulfilled.match(result)) {
            navigate('/', { replace: true });
        }
    };

    // Extract readable error messages
    const getErrors = () => {
        if (!error) return null;
        if (error.detail) return [error.detail];
        const msgs = [];
        for (const key of Object.keys(error)) {
            const val = error[key];
            if (Array.isArray(val)) msgs.push(...val);
            else if (typeof val === 'string') msgs.push(val);
        }
        return msgs.length > 0 ? msgs : ['Registration failed. Please check your input.'];
    };

    const errors = getErrors();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <div className="flex justify-center mb-3">
                        <img src="/logo.png" alt="Shopzy" className="h-11 w-auto object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-white text-center mb-2">
                        Create account
                    </h1>
                    <p className="text-slate-400 text-center mb-8">
                        Join Shopzy as a buyer or merchant
                    </p>

                    {errors && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm"
                        >
                            <ul className="list-disc list-inside space-y-1">
                                {errors.map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                ))}
                            </ul>
                        </motion.div>
                    )}

                    {/* Role Toggle */}
                    <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 mb-6">
                        {[
                            { value: 'USER', label: 'Buyer' },
                            { value: 'MERCHANT', label: 'Merchant' },
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setForm({ ...form, role: opt.value })}
                                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    form.role === opt.value
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="reg-user-name" className="block text-sm font-medium text-slate-300 mb-1.5">
                                User name
                            </label>
                            <input
                                id="reg-user-name"
                                name="user_name"
                                type="text"
                                required
                                value={form.user_name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                                Email
                            </label>
                            <input
                                id="reg-email"
                                name="email"
                                type="email"
                                required
                                value={form.email}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="reg-phone" className="block text-sm font-medium text-slate-300 mb-1.5">
                                Mobile number
                            </label>
                            <input
                                id="reg-phone"
                                name="phone_number"
                                type="tel"
                                value={form.phone_number}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="+91 98765 43210"
                            />
                        </div>

                        <div>
                            <label htmlFor="reg-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="reg-password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    value={form.password}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 pr-11 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors focus:outline-none p-1"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="reg-password-confirm" className="block text-sm font-medium text-slate-300 mb-1.5">
                                Confirm password
                            </label>
                            <div className="relative">
                                <input
                                    id="reg-password-confirm"
                                    name="password_confirm"
                                    type={showPasswordConfirm ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    value={form.password_confirm}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 pr-11 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors focus:outline-none p-1"
                                    aria-label={showPasswordConfirm ? "Hide password" : "Show password"}
                                >
                                    {showPasswordConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors duration-200 mt-2"
                        >
                            {isLoading ? 'Creating account…' : 'Create account'}
                        </button>
                    </form>

                    <p className="text-slate-400 text-center mt-6 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
