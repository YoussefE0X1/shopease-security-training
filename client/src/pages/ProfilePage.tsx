import { useState, useEffect } from 'react';
import { User, MapPin, Heart, Pencil, Plus, Trash2, Star, Lock, Eye, EyeOff, Wallet, Ticket } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageSpinner } from '../components/ui/Spinner';
import { Price } from '../components/ui/Price';
import { formatDate } from '../utils/format';
import type { UserProfile, Address, Coupon } from '../types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'addresses' | 'wishlist' | 'wallet'>('info');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const [addressModal, setAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addrForm, setAddrForm] = useState({ label: '', street: '', city: '', state: '', zip: '', country: '' });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const { logout } = useAuth();
  const { showToast } = useToast();

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/users/profile');
      setProfile(data.data);
      setEditName(data.data.name);
      setEditPhone(data.data.phone || '');
    } catch { showToast('Failed to load profile', 'error'); }
    finally { setLoading(false); }
  };

  const fetchWallet = async () => {
    try {
      const { data } = await api.get('/users/wallet');
      setWallet(data.data);
    } catch { /* wallet is optional */ }
  };

  useEffect(() => { fetchProfile(); fetchWallet(); }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/users/profile', { name: editName, phone: editPhone || undefined });
      setProfile((prev) => prev ? { ...prev, name: data.data.name, phone: data.data.phone } : prev);
      setEditing(false);
      showToast('Profile updated!', 'success');
    } catch (err: any) { showToast(err?.message || 'Error', 'error'); }
    finally { setSaving(false); }
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        const { data } = await api.patch(`/users/addresses/${editingAddress._id}`, addrForm);
        setProfile((prev) => prev ? { ...prev, addresses: data.data } : prev);
      } else {
        const { data } = await api.post('/users/addresses', addrForm);
        setProfile((prev) => prev ? { ...prev, addresses: data.data } : prev);
      }
      setAddressModal(false);
      setEditingAddress(null);
      setAddrForm({ label: '', street: '', city: '', state: '', zip: '', country: '' });
      showToast(editingAddress ? 'Address updated!' : 'Address added!', 'success');
    } catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  const deleteAddress = async (id: string) => {
    try {
      const { data } = await api.delete(`/users/addresses/${id}`);
      setProfile((prev) => prev ? { ...prev, addresses: data.data } : prev);
      showToast('Address deleted', 'success');
    } catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  const toggleWishlist = async (productId: string) => {
    try {
      await api.post(`/users/wishlist/${productId}`);
      fetchProfile();
    } catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  const deleteAccount = async () => {
    try {
      await api.delete('/users/me');
      showToast('Account deleted', 'success');
      setTimeout(() => logout(), 1500);
    } catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  if (loading) return <PageSpinner />;
  if (!profile) return <div className="text-center py-20 text-gray-500 dark:text-gray-400">Failed to load profile</div>;

  const tabs = [
    { key: 'info', label: 'Profile', icon: User },
    { key: 'addresses', label: `Addresses (${profile.addresses?.length || 0})`, icon: MapPin },
    { key: 'wishlist', label: `Wishlist (${profile.wishlist?.length || 0})`, icon: Heart },
    { key: 'wallet', label: `Wallet (${wallet.length})`, icon: Wallet },
  ] as const;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">My Profile</h1>

      <div className="flex gap-1 mb-8 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.key}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${tab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            onClick={() => setTab(t.key)}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="max-w-2xl">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Personal Information</h2>
              {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</Button>}
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-2xl font-bold">
                {profile.name[0]}
              </div>
              <div>
                <p className="font-medium text-lg text-gray-900 dark:text-gray-100">{profile.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
              </div>
            </div>

            {editing ? (
              <div className="space-y-4">
                <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                <Input label="Phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+1 234 567 890" />
                <div className="flex gap-3 pt-2">
                  <Button onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                  <Button variant="outline" onClick={() => { setEditing(false); setEditName(profile.name); setEditPhone(profile.phone || ''); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Email</label><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{profile.email}</p></div>
                <div><label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Phone</label><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{profile.phone || 'Not set'}</p></div>
                <div><label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Role</label><p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{profile.role}</p></div>
                <div><label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Member since</label><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{new Date(profile.createdAt).toLocaleDateString()}</p></div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-6 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={18} className="text-gray-500 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Change Password</h2>
            </div>
            <div className="max-w-sm space-y-4">
              <div className="relative">
                <Input label="Current Password" type={showPw ? 'text' : 'password'} value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} />
                <button type="button" className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 cursor-pointer"
                  onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              <Input label="New Password" type="password" value={pwForm.newPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} minLength={6} />
              <Input label="Confirm New Password" type="password" value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))} />
              <Button onClick={async () => {
                if (pwForm.newPassword !== pwForm.confirmPassword) { showToast('Passwords do not match', 'error'); return; }
                setChangingPw(true);
                try {
                  await api.post('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
                  showToast('Password changed! Please login again.', 'success');
                  setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setTimeout(() => logout(), 2000);
                } catch (err: any) { showToast(err?.message || err?.data?.message || 'Error', 'error'); }
                finally { setChangingPw(false); }
              }} disabled={changingPw} variant="outline">
                {changingPw ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-6 mt-6">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">Delete Account</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Deleting your account is permanent. The primary admin account cannot be deleted.
            </p>
            <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
              onClick={() => {
                if (window.confirm('Are you sure you want to permanently delete your account?')) deleteAccount();
              }}>
              <Trash2 size={14} /> Delete My Account
            </Button>
          </div>
        </div>
      )}

      {tab === 'addresses' && (
        <div className="max-w-3xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Saved Addresses</h2>
            <Button size="sm" onClick={() => { setEditingAddress(null); setAddrForm({ label: '', street: '', city: '', state: '', zip: '', country: '' }); setAddressModal(true); }}>
              <Plus size={14} /> Add Address
            </Button>
          </div>

          {!profile.addresses?.length ? (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700">
              <MapPin size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">No addresses saved</p>
              <Button onClick={() => setAddressModal(true)}><Plus size={16} /> Add Address</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.addresses.map((addr) => (
                <div key={addr._id} className={`bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-5 relative ${addr.isDefault ? 'ring-2 ring-indigo-500' : ''}`}>
                  {addr.isDefault && <span className="absolute top-3 right-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-2 py-0.5 rounded-full">Default</span>}
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-indigo-500 dark:text-indigo-400" />
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{addr.label}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{addr.street}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{addr.city}, {addr.state} {addr.zip}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{addr.country}</p>
                  <div className="flex gap-2 mt-3 pt-3 border-t dark:border-gray-700">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingAddress(addr); setAddrForm({ label: addr.label, street: addr.street, city: addr.city, state: addr.state, zip: addr.zip, country: addr.country }); setAddressModal(true); }}>
                      <Pencil size={12} /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => deleteAddress(addr._id)}>
                      <Trash2 size={12} /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'wishlist' && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">My Wishlist</h2>
          {!profile.wishlist?.length ? (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700">
              <Heart size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Your wishlist is empty</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {profile.wishlist.map((p) => (
                <div key={p._id} className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border dark:border-gray-700 group relative">
                  <button className="absolute top-3 right-3 z-10 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition cursor-pointer"
                    onClick={() => toggleWishlist(p._id)}>
                    <Heart size={16} className="text-red-500 fill-red-500" />
                  </button>
                  <div className="aspect-[4/3] overflow-hidden bg-gray-50 dark:bg-gray-800">
                    <img src={p.images?.[0] || 'https://placehold.co/400'} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                    <div className="flex items-center gap-1 mt-1 text-amber-400 text-xs">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} fill={i < Math.round(p.rating) ? 'currentColor' : 'none'} />)}
                      <span className="text-gray-400 ml-1">({p.numReviews})</span>
                    </div>
                    <Price value={p.price} className="text-sm mt-1 inline-block" />
                    <Button size="sm" className="w-full mt-3">Add to Cart</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'wallet' && (
        <div>
          <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">My Coupon Wallet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Coupons the admin created for you land here with a notification.</p>
          {!wallet.length ? (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700">
              <Wallet size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Your wallet is empty — no coupons yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wallet.map((c) => (
                <div key={c._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 p-5 relative overflow-hidden">
                  <div className="absolute -right-3 -top-3 w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full" />
                  <div className="flex items-center gap-2 mb-3">
                    <Ticket size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm break-all">{c.code}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                    {c.type === 'percentage' ? `${c.value}% OFF` : `$${c.value} OFF`}
                  </div>
                  <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex justify-between"><span>Min order</span><span>${c.minOrderAmount || 0}</span></div>
                    <div className="flex justify-between"><span>Uses left</span><span>{Math.max(0, c.usageLimit - c.usedCount)} / {c.usageLimit}</span></div>
                    <div className="flex justify-between"><span>Expires</span><span>{formatDate(c.expiresAt)}</span></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700 text-xs text-emerald-600 dark:text-emerald-400 font-medium">Valid for your account</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={addressModal} onClose={() => setAddressModal(false)} title={editingAddress ? 'Edit Address' : 'Add Address'}>
        <form onSubmit={saveAddress} className="space-y-4">
          <Input label="Label" value={addrForm.label} onChange={(e) => setAddrForm((f) => ({ ...f, label: e.target.value }))} placeholder="Home, Work, etc." required />
          <Input label="Street" value={addrForm.street} onChange={(e) => setAddrForm((f) => ({ ...f, street: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={addrForm.city} onChange={(e) => setAddrForm((f) => ({ ...f, city: e.target.value }))} required />
            <Input label="State" value={addrForm.state} onChange={(e) => setAddrForm((f) => ({ ...f, state: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="ZIP Code" value={addrForm.zip} onChange={(e) => setAddrForm((f) => ({ ...f, zip: e.target.value }))} required />
            <Input label="Country" value={addrForm.country} onChange={(e) => setAddrForm((f) => ({ ...f, country: e.target.value }))} required />
          </div>
          <div className="flex gap-3">
            <Button type="submit">{editingAddress ? 'Update' : 'Save'}</Button>
            <Button variant="outline" type="button" onClick={() => setAddressModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
