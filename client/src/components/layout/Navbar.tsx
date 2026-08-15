import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, LayoutDashboard, LogOut, Store, User, Sun, Moon, Target } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/Button';
import { NotificationsDropdown } from '../ui/NotificationsDropdown';

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  const isActive = (path: string) => location.pathname === path ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200';

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/shop" className="flex items-center gap-2 text-xl font-bold text-indigo-600 dark:text-indigo-400">
            <Store size={24} /> ShopEase
          </Link>

          <div className="flex items-center gap-1">
            <NotificationsDropdown />
            <button onClick={toggle} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer" title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/shop" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive('/shop')}`}>
              <Package size={18} /> Shop
            </Link>
            <Link to="/cart" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive('/cart')}`}>
              <ShoppingCart size={18} /> Cart {itemCount > 0 && <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5">{itemCount}</span>}
            </Link>
            <Link to="/orders" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive('/orders')}`}>
              <Package size={18} /> Orders
            </Link>
            <Link to="/profile" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive('/profile')}`}>
              <User size={18} /> Profile
            </Link>
            <Link to="/challenges" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive('/challenges')}`}>
              <Target size={18} /> Challenges
            </Link>
            {isAdmin && (
              <Link to="/admin" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive('/admin')}`}>
                <LayoutDashboard size={18} /> Admin
              </Link>
            )}
            <div className="ml-4 pl-4 border-l border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">{user?.name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut size={16} /> Logout</Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
