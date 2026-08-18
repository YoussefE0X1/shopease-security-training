import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, MapPin, CheckCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { Button } from '../components/ui/Button';
import { Price } from '../components/ui/Price';
import { PageSpinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import api from '../services/api';
import type { Address } from '../types';

export default function CartPage() {
  const { cart, loading, fetchCart, updateQty, removeItem } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string>('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponData, setCouponData] = useState<any>(null);
  const [couponMsg, setCouponMsg] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);
  const { showToast } = useToast();
  const { fetchNotifications } = useNotifications();

  useEffect(() => { fetchCart(); loadAddresses(); }, []);

  const loadAddresses = async () => {
    try {
      const { data } = await api.get('/users/profile');
      const addr: Address[] = data.data.addresses || [];
      setAddresses(addr);
      const def = addr.find((a) => a.isDefault) || addr[0];
      if (def) setSelectedAddr(def._id);
    } catch {}
  };

  // Each line total already includes the per-item discount rate the item was
  // added with (unit price × qty × (1 − discountPercent/100)).
  const subtotal = cart?.items?.reduce((s, i) => s + (i.lineTotal ?? Math.round(i.price * i.quantity * (1 - (i.discountPercent || 0) / 100) * 100) / 100), 0) || 0;
  const itemDiscount = (cart?.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0) - subtotal;
  const shipping = subtotal > 100 ? 0 : 10;
  const total = Math.max(0, subtotal + shipping - couponDiscount);

  const applyCoupon = async () => {
    if (!couponCode) return;
    try {
      const { data } = await api.post('/coupons/validate', { code: couponCode, orderTotal: subtotal });
      setCouponDiscount(data.data.discount);
      setCouponData(data.data.coupon);
      setCouponMsg(`Coupon "${data.data.coupon.code}" applied! -$${data.data.discount.toFixed(2)}`);
      showToast('Coupon applied!', 'success');
    } catch (err: any) {
      setCouponDiscount(0); setCouponData(null);
      setCouponMsg(err?.message || 'Invalid coupon');
      showToast(err?.message || 'Invalid coupon', 'error');
    }
  };

  const reviewOrder = () => {
    if (!addresses.length) { showToast('Please add a shipping address in your profile', 'error'); return; }
    setConfirmModal(true);
  };

  const placeOrder = async () => {
    setOrdering(true);
    try {
      const { data } = await api.post('/orders', {
        shippingAddressId: selectedAddr,
        couponCode: couponData?.code || undefined,
      });
      setOrderResult(data.data.order);
      setCouponDiscount(0); setCouponCode(''); setCouponData(null); setCouponMsg('');
      fetchCart();
      fetchNotifications();
      showToast('Order placed successfully!', 'success');
    } catch (err: any) { showToast(err?.message || 'Checkout failed', 'error'); }
    finally { setOrdering(false); }
  };

  const selectedAddress = addresses.find((a) => a._id === selectedAddr);

  if (loading) return <PageSpinner />;

  if (orderResult) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Order Confirmed!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-2">Order #{orderResult.cardId}</p>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Total paid: <strong>${orderResult.total.toFixed(2)}</strong></p>
        <div className="flex gap-3 justify-center">
          <Link to="/orders"><Button>View Orders</Button></Link>
          <Link to="/shop"><Button variant="outline">Continue Shopping</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
        <ArrowLeft size={16} /> Continue Shopping
      </Link>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Shopping Cart</h1>

      {!cart?.items?.length ? (
        <div className="text-center py-20">
          <ShoppingBag size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">Your cart is empty</p>
          <Link to="/shop"><Button>Browse Products</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <div key={item._id} className="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-4">
                <img src={item.product?.images?.[0] || 'https://placehold.co/80'} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product?._id}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1">
                    {item.product?.name}
                  </Link>
                  <div className="flex items-center gap-2">
                    <Price value={item.price} className="text-sm" />
                    {item.discountPercent ? (
                      <span className="text-[11px] font-semibold text-green-600 bg-green-50 dark:bg-green-900/40 rounded-full px-1.5 py-0.5">-{item.discountPercent}%</span>
                    ) : null}
                  </div>
                  {item.variant && <p className="text-xs text-gray-400 dark:text-gray-500">{item.variant.name}: {item.variant.label}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 rounded-lg border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer" onClick={() => updateQty(item._id, item.quantity - 1)}><Minus size={14} /></button>
                  <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-gray-100">{item.quantity}</span>
                  <button className="p-1.5 rounded-lg border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer" onClick={() => updateQty(item._id, item.quantity + 1)}><Plus size={14} /></button>
                </div>
                <div className="text-right w-20">
                  <Price value={item.lineTotal ?? Math.round(item.price * item.quantity * (1 - (item.discountPercent || 0) / 100) * 100) / 100} className="text-sm font-semibold" />
                </div>
                <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition cursor-pointer" onClick={() => removeItem(item._id)}><Trash2 size={18} /></button>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Order Summary</h3>
              <div className="space-y-2 text-sm text-gray-900 dark:text-gray-100">
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                {itemDiscount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Store discount</span><span>-${itemDiscount.toFixed(2)}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Shipping</span><span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span></div>
                {couponDiscount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Discount</span><span>-${couponDiscount.toFixed(2)}</span></div>}
                <div className="border-t dark:border-gray-700 pt-2 flex justify-between font-semibold text-lg"><span>Total</span><span className="text-indigo-600 dark:text-indigo-400">${total.toFixed(2)}</span></div>
              </div>
              <div className="flex gap-2">
                <input className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                <Button variant="outline" size="sm" onClick={applyCoupon}>Apply</Button>
              </div>
              {couponMsg && <p className={`text-xs ${couponDiscount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{couponMsg}</p>}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Shipping Address</h3>
              {addresses.length === 0 ? (
                <div className="text-center py-4">
                  <MapPin size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">No addresses saved</p>
                  <Link to="/profile"><Button size="sm" variant="outline">Add in Profile</Button></Link>
                </div>
              ) : (
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={selectedAddr} onChange={(e) => setSelectedAddr(e.target.value)}>
                  {addresses.map((a) => (
                    <option key={a._id} value={a._id}>{a.label} — {a.street}, {a.city}</option>
                  ))}
                </select>
              )}
              {selectedAddress && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zip}, {selectedAddress.country}
                </p>
              )}
            </div>

            <Button className="w-full" size="lg" onClick={reviewOrder} disabled={!cart?.items?.length}>
              Review Order
            </Button>
          </div>
        </div>
      )}

      <Modal open={confirmModal} onClose={() => setConfirmModal(false)} title="Confirm Order" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">Shipping to:</p>
            {selectedAddress && (
              <p className="text-sm text-gray-600 dark:text-gray-300">{selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zip}</p>
            )}
          </div>
          <div className="space-y-2 text-sm text-gray-900 dark:text-gray-100">
            <div className="flex justify-between"><span>Items ({cart?.items?.length})</span><span>${subtotal.toFixed(2)}</span></div>
            {itemDiscount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Store discount</span><span>-${itemDiscount.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span></div>
            {couponDiscount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Discount</span><span>-${couponDiscount.toFixed(2)}</span></div>}
            <div className="border-t dark:border-gray-700 pt-2 flex justify-between font-bold text-lg"><span>Total</span><span className="text-indigo-600 dark:text-indigo-400">${total.toFixed(2)}</span></div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={placeOrder} disabled={ordering}>
              {ordering ? 'Placing Order...' : 'Place Order'}
            </Button>
            <Button variant="outline" onClick={() => setConfirmModal(false)} disabled={ordering}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
