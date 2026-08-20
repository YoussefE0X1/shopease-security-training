import { useState, useEffect } from 'react';
import { Users, Package, ShoppingCart, DollarSign, TrendingUp, Plus, Trash2, Pencil, Shield, Tag, Lock } from 'lucide-react';
import { OrderTimeline } from '../components/ui/OrderTimeline';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { formatDate, price as fmtPrice } from '../utils/format';
import type { AdminStats, Order, Coupon, Product, Category, User } from '../types';

export default function AdminPage() {
  const [tab, setTab] = useState<'dashboard' | 'products' | 'categories' | 'orders' | 'coupons' | 'users'>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({ name: '', description: '', price: '', comparePrice: '', stock: '10', category: '', tags: '' });

  const [categoryModal, setCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  const [couponModal, setCouponModal] = useState(false);
  const [couponScope, setCouponScope] = useState<'general' | 'users'>('general');
  const [couponUserIds, setCouponUserIds] = useState<string[]>([]);
  const [userModal, setUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('customer');

  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const deleteUser = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      setUsers((u) => u.filter((x) => x._id !== id));
      showToast('User deleted', 'success');
    } catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/stats').then((r) => setStats(r.data.data)).catch(() => {}),
      api.get('/orders?limit=100').then((r) => setOrders(r.data.data)).catch(() => {}),
      api.get('/coupons').then((r) => setCoupons(r.data.data)).catch(() => {}),
      api.get('/products?limit=100').then((r) => setAllProducts(r.data.data)).catch(() => {}),
      api.get('/categories').then((r) => setCategories(r.data.data)).catch(() => {}),
      api.get('/users').then((r) => setUsers(r.data.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProdForm({ name: product.name, description: product.description, price: String(product.price), comparePrice: product.comparePrice ? String(product.comparePrice) : '', stock: String(product.stock), category: product.category?._id || '', tags: product.tags?.join(', ') || '' });
    } else {
      setEditingProduct(null);
      setProdForm({ name: '', description: '', price: '', comparePrice: '', stock: '10', category: '', tags: '' });
    }
    setProductModal(true);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name: prodForm.name, description: prodForm.description, price: parseFloat(prodForm.price), stock: parseInt(prodForm.stock), category: prodForm.category || undefined, tags: prodForm.tags.split(',').map((t) => t.trim()).filter(Boolean) };
    if (prodForm.comparePrice) (data as any).comparePrice = parseFloat(prodForm.comparePrice);
    try {
      if (editingProduct) {
        const { data: res } = await api.patch(`/products/${editingProduct._id}`, data);
        setAllProducts((p) => p.map((x) => x._id === editingProduct._id ? res.data : x));
        showToast('Product updated!', 'success');
      } else {
        const { data: res } = await api.post('/products', data);
        setAllProducts((p) => [res.data, ...p]);
        showToast('Product created!', 'success');
      }
      setProductModal(false);
    } catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  const deleteProduct = async (id: string) => {
    try { await api.delete(`/products/${id}`); setAllProducts((p) => p.filter((x) => x._id !== id)); showToast('Product deleted', 'success'); }
    catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  const openCategoryModal = (cat?: Category) => {
    if (cat) { setEditingCategory(cat); setCatForm({ name: cat.name, description: cat.description || '' }); }
    else { setEditingCategory(null); setCatForm({ name: '', description: '' }); }
    setCategoryModal(true);
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        const { data } = await api.patch(`/categories/${editingCategory._id}`, catForm);
        setCategories((c) => c.map((x) => x._id === editingCategory._id ? data.data : x));
        showToast('Category updated!', 'success');
      } else {
        const { data } = await api.post('/categories', catForm);
        setCategories((c) => [...c, data.data]);
        showToast('Category created!', 'success');
      }
      setCategoryModal(false);
    } catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  const deleteCategory = async (id: string) => {
    try { await api.delete(`/categories/${id}`); setCategories((c) => c.filter((x) => x._id !== id)); showToast('Category deleted', 'success'); }
    catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try { await api.patch(`/orders/${id}/status`, { orderStatus: status }); showToast('Order updated', 'success'); }
    catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  const deleteCoupon = async (id: string) => {
    try { await api.delete(`/coupons/${id}`); setCoupons((c) => c.filter((x) => x._id !== id)); showToast('Coupon deleted', 'success'); }
    catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  const createCoupon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const rawValue = parseFloat(fd.get('value') as string);
    if (isNaN(rawValue)) { showToast('Value must be a valid number', 'error'); return; }
    if (couponScope === 'users' && couponUserIds.length === 0) { showToast('Select at least one user for this coupon', 'error'); return; }
    const data = { code: fd.get('code'), type: fd.get('type'), value: rawValue, minOrderAmount: parseFloat(fd.get('minOrderAmount') as string) || 0, usageLimit: parseInt(fd.get('usageLimit') as string) || 1, expiresAt: fd.get('expiresAt'), userIds: couponScope === 'users' ? couponUserIds : undefined };
    try {
      const { data: res } = await api.post('/coupons', data);
      setCoupons((c) => [res.data, ...c]);
      setCouponModal(false);
      showToast('Coupon created', 'success');
    } catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  const toggleCouponUser = (id: string) => {
    setCouponUserIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  const changeUserRole = async () => {
    if (!selectedUser) return;
    try {
      await api.patch(`/users/${selectedUser._id}/role`, { role: newRole });
      setUsers((u) => u.map((x) => x._id === selectedUser._id ? { ...x, role: newRole as 'customer' | 'admin' } : x));
      setUserModal(false);
      showToast('User role updated', 'success');
    } catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  if (loading) return <PageSpinner />;

  const navTabs = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: TrendingUp },
    { key: 'products' as const, label: 'Products', icon: Package },
    { key: 'categories' as const, label: 'Categories', icon: Tag },
    { key: 'orders' as const, label: 'Orders', icon: ShoppingCart },
    { key: 'coupons' as const, label: 'Coupons', icon: DollarSign },
    { key: 'users' as const, label: 'Users', icon: Users },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
      <div className="flex gap-1 mb-8 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 flex-wrap">
        {navTabs.map((t) => (
          <button key={t.key}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${tab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            onClick={() => setTab(t.key)}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && stats && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Customers', value: stats.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600' },
              { label: 'Products', value: stats.totalProducts, icon: Package, color: 'bg-purple-50 text-purple-600' },
              { label: 'Orders', value: stats.totalOrders, icon: ShoppingCart, color: 'bg-amber-50 text-amber-600' },
              { label: 'Revenue', value: `$${fmtPrice(stats.totalRevenue)}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-5">
                <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}><s.icon size={20} /></div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-5">
              <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Orders by Status</h3>
              <div className="flex flex-wrap gap-2">
                {stats.ordersByStatus.map((o) => <Badge key={o.status} status={o.status} />)}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-5">
              <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Top Products</h3>
              <div className="space-y-3">
                {stats.topProducts.map((p) => (
                  <div key={p._id} className="flex items-center gap-3">
                    <img src={p.images?.[0] || 'https://placehold.co/40'} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{p.name}</p></div>
                    <span className="text-sm text-gray-500">{p.sold} sold</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">All Products ({allProducts.length})</h2>
            <Button onClick={() => openProductModal()}><Plus size={16} /> Add Product</Button>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800"><tr>
                <th className="text-left p-3 font-medium">Product</th><th className="text-left p-3 font-medium">Price</th><th className="text-left p-3 font-medium">Stock</th><th className="text-left p-3 font-medium">Sold</th><th className="p-3"></th>
              </tr></thead>
              <tbody className="divide-y">
                {allProducts.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 flex items-center gap-3">
                      <img src={p.images?.[0] || 'https://placehold.co/32'} alt="" className="w-8 h-8 rounded object-cover" />
                      <span className="font-medium truncate max-w-[200px] text-gray-900 dark:text-gray-100">{p.name}</span>
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">${fmtPrice(p.price)}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">{p.stock}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">{p.sold}</td>
                    <td className="p-3 flex gap-1">
                      <button className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer" onClick={() => openProductModal(p)}><Pencil size={14} /></button>
                      <button className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer" onClick={() => deleteProduct(p._id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Categories ({categories.length})</h2>
            <Button onClick={() => openCategoryModal()}><Plus size={16} /> Add Category</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div key={c._id} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{c.name}</h3>
                    {c.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.description}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t dark:border-gray-700">
                  <Button variant="ghost" size="sm" onClick={() => openCategoryModal(c)}><Pencil size={12} /> Edit</Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => deleteCategory(c._id)}><Trash2 size={12} /> Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o._id} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div><span className="text-sm text-gray-400 dark:text-gray-500">#</span><span className="text-sm font-mono text-gray-900 dark:text-gray-100">{o._id.slice(-8)}</span><span className="text-xs text-gray-400 dark:text-gray-500 ml-3">{formatDate(o.createdAt)}</span></div>
                <Badge status={o.orderStatus} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{o.items.length} items &middot; ${fmtPrice(o.total)}</p>
              {o.statusHistory && o.statusHistory.length > 0 && (
                <div className="mb-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                  <OrderTimeline history={o.statusHistory} />
                </div>
              )}
              <div className="flex gap-2">
                <select className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={o.orderStatus} onChange={(e) => updateOrderStatus(o._id, e.target.value)}>
                  <option value="pending">Pending</option><option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option><option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'coupons' && (
        <div>
          <div className="flex justify-between items-center mb-4"><h2 className="font-semibold text-gray-900 dark:text-gray-100">Coupons</h2><Button onClick={() => { setCouponScope('general'); setCouponUserIds([]); setCouponModal(true); }}><Plus size={16} /> Add Coupon</Button></div>
          <div className="space-y-3">
            {coupons.map((c) => (
              <div key={c._id} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{c.code}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-3">{c.type === 'percentage' ? `${c.value}%` : `$${fmtPrice(c.value)}`}</span>
                  <span className="text-sm text-gray-400 dark:text-gray-500 ml-3">Used: {c.usedCount}/{c.usageLimit}</span>
                  <span className="text-sm text-gray-400 dark:text-gray-500 ml-3">Expires: {formatDate(c.expiresAt)}</span>
                  {c.userIds && c.userIds.length > 0 ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-2 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30">
                      {c.userIds.length === 1 ? `For: ${users.find((u) => u._id === c.userIds?.[0])?.email || c.userIds[0]}` : `For ${c.userIds.length} users`}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">Everyone</span>
                  )}
                  {!c.isActive && <span className="text-xs text-red-500 dark:text-red-400 ml-2">Inactive</span>}
                </div>
                <button className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer" onClick={() => deleteCoupon(c._id)}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <h2 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">All Users ({users.length})</h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800"><tr>
                <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Name</th><th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Email</th><th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Role</th><th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Joined</th><th className="p-3"></th>
              </tr></thead>
              <tbody className="divide-y dark:divide-gray-700">
                {users.map((u: any) => (
                  <tr key={u._id || u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{u.name}</td>
                    <td className="p-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="p-3"><Badge status={u.role} /></td>
                    <td className="p-3 text-gray-400 dark:text-gray-500 text-xs">{u.createdAt ? formatDate(u.createdAt) : '-'}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        {u._id !== currentUser?._id && (u.isProtected ? (
                          <span className="p-1.5 text-gray-300 dark:text-gray-600" title="Primary admin account is protected">
                            <Lock size={14} />
                          </span>
                        ) : (
                          <button className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer" title="Delete user" onClick={() => deleteUser(u._id)}>
                            <Trash2 size={14} />
                          </button>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => { setSelectedUser(u); setNewRole(u.role); setUserModal(true); }}>
                          <Shield size={12} /> Change Role
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={productModal} onClose={() => setProductModal(false)} title={editingProduct ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={saveProduct} className="space-y-4">
          <Input label="Name" value={prodForm.name} onChange={(e) => setProdForm((f) => ({ ...f, name: e.target.value }))} required />
          <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" rows={3}
              value={prodForm.description} onChange={(e) => setProdForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price" type="number" step="0.01" value={prodForm.price} onChange={(e) => setProdForm((f) => ({ ...f, price: e.target.value }))} required />
            <Input label="Compare Price" type="number" step="0.01" value={prodForm.comparePrice} onChange={(e) => setProdForm((f) => ({ ...f, comparePrice: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Stock" type="number" value={prodForm.stock} onChange={(e) => setProdForm((f) => ({ ...f, stock: e.target.value }))} />
            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" value={prodForm.category}
                onChange={(e) => setProdForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="">None</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <Input label="Tags (comma separated)" value={prodForm.tags} onChange={(e) => setProdForm((f) => ({ ...f, tags: e.target.value }))} placeholder="e.g. new, trending" />
          <div className="flex gap-3"><Button type="submit">{editingProduct ? 'Update' : 'Save'}</Button><Button variant="outline" type="button" onClick={() => setProductModal(false)}>Cancel</Button></div>
        </form>
      </Modal>

      <Modal open={categoryModal} onClose={() => setCategoryModal(false)} title={editingCategory ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={saveCategory} className="space-y-4">
          <Input label="Name" value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} required />
          <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" rows={2}
              value={catForm.description} onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex gap-3"><Button type="submit">{editingCategory ? 'Update' : 'Save'}</Button><Button variant="outline" type="button" onClick={() => setCategoryModal(false)}>Cancel</Button></div>
        </form>
      </Modal>

      <Modal open={couponModal} onClose={() => setCouponModal(false)} title="Add Coupon">
        <form onSubmit={createCoupon} className="space-y-4">
          <Input label="Code" name="code" required />
          <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
            <select name="type" className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <option value="percentage">Percentage</option><option value="fixed">Fixed</option>
            </select></div>
          <Input label="Value" name="value" type="number" step="0.01" required />
          <div className="grid grid-cols-2 gap-4"><Input label="Min Order" name="minOrderAmount" type="number" defaultValue="0" /><Input label="Usage Limit" name="usageLimit" type="number" defaultValue="1" /></div>
          <Input label="Expiry Date" name="expiresAt" type="date" required />

          <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Who can use it?</label>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button type="button" className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${couponScope === 'general' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`} onClick={() => setCouponScope('general')}>Everyone (general)</button>
              <button type="button" className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${couponScope === 'users' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`} onClick={() => setCouponScope('users')}>Specific users</button>
            </div>
          </div>

          {couponScope === 'users' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select users ({couponUserIds.length} selected)</label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg divide-y dark:divide-gray-700">
                {users.map((u) => (
                  <label key={u._id} className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${couponUserIds.includes(u._id) ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    <input type="checkbox" className="accent-indigo-600" checked={couponUserIds.includes(u._id)} onChange={() => toggleCouponUser(u._id)} />
                    <span className="font-medium">{u.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{u.email}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3"><Button type="submit">Save</Button><Button variant="outline" type="button" onClick={() => setCouponModal(false)}>Cancel</Button></div>
        </form>
      </Modal>

      <Modal open={userModal} onClose={() => setUserModal(false)} title="Change User Role" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            User: <strong className="text-gray-900 dark:text-gray-100">{selectedUser?.name}</strong> ({selectedUser?.email})
          </p>
          <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Role</label>
            <select className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              <option value="customer">Customer</option><option value="admin">Admin</option>
            </select></div>
          <div className="flex gap-3"><Button onClick={changeUserRole}>Update Role</Button><Button variant="outline" onClick={() => setUserModal(false)}>Cancel</Button></div>
        </div>
      </Modal>
    </div>
  );
}
