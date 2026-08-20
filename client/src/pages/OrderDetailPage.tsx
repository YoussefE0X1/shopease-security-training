import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import api from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Price } from '../components/ui/Price';
import { PageSpinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { OrderTimeline } from '../components/ui/OrderTimeline';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';
import type { OrderDetail } from '../types';

export default function OrderDetailPage() {
  const { cardId } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    api.get(`/orders/${cardId}`)
      .then(({ data }) => setOrder(data.data.order))
      .catch((err: any) => showToast(err?.message || 'Failed to load order', 'error'))
      .finally(() => setLoading(false));
  }, [cardId]);

  if (loading) return <PageSpinner />;
  if (!order) {
    return (
      <div className="text-center py-20">
        <Package size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Order not found</p>
        <div className="mt-4"><Link to="/orders"><Button variant="outline" size="sm">Back to My Orders</Button></Link></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <Link to="/orders">
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} />
            <span className="ml-1">Back to My Orders</span>
          </Button>
        </Link>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <span className="text-sm text-gray-400 dark:text-gray-500">Order #</span>
            <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">{order.cardId}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-3">{formatDate(order.createdAt)}</span>
          </div>
          <Badge status={order.orderStatus} />
        </div>
        <div className="space-y-2 mb-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <img src={item.image || 'https://placehold.co/40'} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-50" />
              <span className="flex-1 text-gray-700 dark:text-gray-200">{item.name} {item.variant && <span className="text-gray-400 dark:text-gray-500">({item.variant.label})</span>}</span>
              <span className="text-gray-500 dark:text-gray-400">x{item.quantity}</span>
              <Price value={item.lineTotal ?? 0} />
              {item.discountPercent ? <span className="text-xs text-green-600">-{item.discountPercent}%</span> : null}
            </div>
          ))}
        </div>
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="border-t dark:border-gray-700 pt-3 mb-3">
            <OrderTimeline history={order.statusHistory} />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t dark:border-gray-700 pt-3 mb-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-1">Buyer</p>
            <p className="text-gray-900 dark:text-gray-100">{order.name}</p>
            <p className="text-gray-600 dark:text-gray-300">{order.email}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-1">Shipping Address</p>
            <p className="text-gray-900 dark:text-gray-100">{order.shippingAddress.street}</p>
            <p className="text-gray-600 dark:text-gray-300">
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip} — {order.shippingAddress.country}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t dark:border-gray-700 pt-3">
          <div className="text-sm"><span className="text-gray-500 dark:text-gray-400">Total: </span><Price value={order.total} /></div>
          {order.discount > 0 && <span className="text-xs text-green-600">-${order.discount.toFixed(2)}</span>}
        </div>
      </div>
    </div>
  );
}