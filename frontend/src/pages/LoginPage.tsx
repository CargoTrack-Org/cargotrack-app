import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import toast from 'react-hot-toast';
import { Truck, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/shipments');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (type: 'user' | 'admin') => {
    if (type === 'user') { setEmail('user@cargotrack.com'); setPassword('user123'); }
    else { setEmail('admin@cargotrack.com'); setPassword('admin123'); }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0f1117' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 flex-col justify-between p-12">
        {/* Decorative gradient */}
        <div className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(245,158,11,0.15) 0%, transparent 70%)' }} />
        <div className="absolute top-0 right-0 w-px h-full bg-slate-800" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Truck className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold text-slate-100">CargoTrack</span>
        </div>

        {/* Tagline */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-amber-500 tracking-widest uppercase">Enterprise Logistics</p>
            <h1 className="text-4xl font-bold text-slate-100 leading-tight">
              Track every shipment.<br />
              <span className="text-amber-400">At every step.</span>
            </h1>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            A unified platform for managing freight, monitoring shipment lifecycle, and delivering visibility to your operations team.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: 'Real-time', label: 'Tracking' },
              { value: 'Multi-tier', label: 'Architecture' },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <p className="text-lg font-bold text-amber-400">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-600">© 2026 CargoTrack</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-slate-100">CargoTrack</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-100">Sign in</h2>
            <p className="text-sm text-slate-500 mt-1">Enter your credentials to access the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-slate-900 text-sm font-semibold rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            No account?{' '}
            <Link to="/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
              Create one
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="border-t border-slate-800 pt-5">
            <p className="text-xs text-slate-600 text-center mb-3">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('user')}
                className="py-2 px-3 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-slate-100 hover:border-slate-600 transition-colors text-center"
              >
                Regular User
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="py-2 px-3 bg-slate-800 border border-amber-500/30 rounded-lg text-xs text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/50 transition-colors text-center"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
