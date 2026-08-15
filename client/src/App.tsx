import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedLayout, AdminLayout } from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import ChallengesPage from './pages/ChallengesPage';
import { useEffect } from 'react';
import { useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext';
import { useNotifications } from './context/NotificationContext';

function CartInitializer() {
  const { user } = useAuth();
  const { fetchCart } = useCart();
  useEffect(() => { if (user) fetchCart(); }, [user]);
  return null;
}

function NotificationInitializer() {
  const { user } = useAuth();
  const { fetchNotifications } = useNotifications();
  useEffect(() => { if (user) fetchNotifications(); }, [user]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
        <ToastProvider>
          <CartProvider>
            <NotificationProvider>
                <CartInitializer />
                <NotificationInitializer />
                <Routes>
                  <Route path="/" element={<LoginPage />} />
                  <Route element={<ProtectedLayout />}>
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/products/:id" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/challenges" element={<ChallengesPage />} />
                  </Route>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </NotificationProvider>
          </CartProvider>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
