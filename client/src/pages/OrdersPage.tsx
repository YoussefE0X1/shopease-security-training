import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import api from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Price } from '../components/ui/Price';
import { PageSpinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { OrderTimeline } from '../components/ui/OrderTimeline';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';
import type { Order, OrderDetail } from '../types';

export default function OrdersPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<Record<string, OrderDetail>>({});
  const { showToast } = useToast();
  const { fetchNotifications } = useNotifications();

  const emailId = user?.email
    ? btoa(user.email).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
    : '';

  const fetchOrders = () => {
    api.get('/orders/mine?limit=50').then(({ data }) => setOrders(data.data)).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  // The orders page lives at /orders/:id — by default it opens with the
  // customer id (Base64URL of the buyer's email) and lists every order.
  useEffect(() => {
    if (!loading && orders.length && !cardId && emailId) {
      navigate(`/orders/${emailId}`, { replace: true });
    }
  }, [loading, orders, cardId, emailId, navigate]);

  const selectedId = cardId ?? orders[0]?.cardId;

  useEffect(() => {
    if (!selectedId || details[selectedId]) return;
    api.get(`/orders/${selectedId}`)
      .then(({ data }) => setDetails((prev) => ({ ...prev, [selectedId]: data.data.order })))
      .catch((err: any) => showToast(err?.message || 'Failed to load order details', 'error'));
  }, [selectedId]);

  const cancelOrder = async (id: string) => {
    try {
      await api.patch(`/orders/${id}/cancel`, {});
      showToast('Order cancelled', 'success');
      fetchOrders();
      fetchNotifications();
    } catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  if (loading) return <PageSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">My Orders</h1>
      {!orders.length ? (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o._id}
              onClick={() => navigate(`/orders/${o.cardId}`)}
              className={`bg-white dark:bg-gray-900 rounded-xl border p-5 cursor-pointer transition
                ${selectedId === o.cardId
                  ? 'border-indigo-400 dark:border-indigo-500 shadow-md'
                  : 'dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <span className="text-sm text-gray-400 dark:text-gray-500">Order #</span>
                  <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">{o.cardId}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-3">{formatDate(o.createdAt)}</span>
                </div>
                <Badge status={o.orderStatus} />
              </div>
              <div className="space-y-2 mb-3">
                {o.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <img src={item.image || 'https://placehold.co/40'} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-50" />
                    <span className="flex-1 text-gray-700 dark:text-gray-200">{item.name} {item.variant && <span className="text-gray-400 dark:text-gray-500">({item.variant.label})</span>}</span>
                    <span className="text-gray-500 dark:text-gray-400">x{item.quantity}</span>
                    <Price value={item.lineTotal ?? item.price * item.quantity} />
                    {item.discountPercent ? <span className="text-xs text-green-600">-{item.discountPercent}%</span> : null}
                  </div>
                ))}
              </div>
              {o.statusHistory && o.statusHistory.length > 0 && (
                <div className="border-t dark:border-gray-700 pt-3 mb-3">
                  <OrderTimeline history={o.statusHistory} />
                </div>
              )}
              <div className="flex items-center justify-between border-t dark:border-gray-700 pt-3">
                <div className="text-sm"><span className="text-gray-500 dark:text-gray-400">Total: </span><Price value={o.total} /></div>
                <div className="flex gap-2">
                  {o.discount > 0 && <span className="text-xs text-green-600">-${o.discount.toFixed(2)}</span>}
                  {['pending', 'confirmed'].includes(o.orderStatus) && (
                    <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); cancelOrder(o._id); }}>Cancel</Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {selectedId && details[selectedId] && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-5 text-sm">
              <p className="text-gray-500 dark:text-gray-400 mb-3">
                Order details — <span className="font-mono text-gray-700 dark:text-gray-200">{selectedId}</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 mb-1">Buyer</p>
                  <p className="text-gray-900 dark:text-gray-100">{details[selectedId].name}</p>
                  <p className="text-gray-600 dark:text-gray-300">{details[selectedId].email}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 mb-1">Shipping Address</p>
                  <p className="text-gray-900 dark:text-gray-100">{details[selectedId].shippingAddress.street}</p>
                  <p className="text-gray-600 dark:text-gray-300">
                    {details[selectedId].shippingAddress.city}, {details[selectedId].shippingAddress.state} {details[selectedId].shippingAddress.zip} — {details[selectedId].shippingAddress.country}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}