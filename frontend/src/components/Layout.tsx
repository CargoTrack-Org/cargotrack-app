import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import {
  Package,
  Search,
  User,
  LogOut,
  Shield,
  Menu,
  X,
  Truck,
} from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/shipments', label: 'Shipments', icon: Package },
    { to: '/track', label: 'Track', icon: Search },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ to: '/admin', label: 'Admin', icon: Shield });
  }

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f1117' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800" style={{ backgroundColor: '#0f1117' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <Link to="/shipments" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center group-hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20">
                <Truck className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-slate-100 tracking-wide">CargoTrack</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                    isActive(item.to)
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              ))}
              <div className="w-px h-4 bg-slate-700 mx-2" />
              <div className="flex items-center gap-2 px-3 py-1">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                  <span className="text-xs font-medium text-slate-300">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-slate-400 max-w-[100px] truncate">{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </nav>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-1.5 rounded-md text-slate-400 hover:bg-slate-800 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900">
            <nav className="px-4 py-2 space-y-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.to)
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
