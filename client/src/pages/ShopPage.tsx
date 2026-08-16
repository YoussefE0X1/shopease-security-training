import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Star } from 'lucide-react';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Price } from '../components/ui/Price';
import { Skeleton } from '../components/ui/Spinner';
import SafeHtml from '../components/ui/SafeHtml';
import type { Product, Category } from '../types';

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  // The search term lives in the URL (?search=...) so an attacker can craft a
  // link and send it to a victim — this is what makes it a *reflected* XSS.
  // Typing only fills the local input; pressing Enter commits it to the URL.
  const search = searchParams.get('search') || '';
  const [input, setInput] = useState(search);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const { addItem } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    setInput(search);
  }, [search]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearchParams(input ? { search: input } : {}, { replace: true });
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/products?limit=50&sort=${sort}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (category) url += `&category=${category}`;
      const { data } = await api.get(url);
      setProducts(data.data);
    } catch { showToast('Failed to load products', 'error'); }
    finally { setLoading(false); }
  }, [search, category, sort]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { api.get('/categories').then(({ data }) => setCategories(data.data)).catch(() => {}); }, []);

// The legitimate 5% store discount every product carries: the card shows the
// discounted price with a "-5%" badge and the catalog price struck through.
const discountedPrice = (p: Product) => Math.round(p.price * (1 - (p.discountPercent || 0) / 100) * 100) / 100;

const handleAdd = async (p: Product) => {
  try { await addItem(p._id, 1, undefined, discountedPrice(p), p.discountPercent ?? 5); showToast('Added to cart!', 'success'); }
  catch (err: any) { showToast(err?.message || err?.data?.message || 'Error', 'error'); }
};

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form className="relative flex-1" onSubmit={handleSubmit}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 dark:text-gray-100"
            placeholder="Search products..." value={input} onChange={(e) => setInput(e.target.value)} />
        </form>
        <select className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
          value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
          value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="-createdAt">Newest</option><option value="-price">Price: High-Low</option>
          <option value="price">Price: Low-High</option><option value="-rating">Top Rated</option>
        </select>
      </div>

      {search && (
        <SafeHtml html={`Results for: ${search}`} className="text-sm text-gray-500 dark:text-gray-400 mb-4" />
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border dark:border-gray-700">
              <Skeleton className="h-48 w-full rounded-none" />
              <div className="p-4 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-8 w-full" /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => (
            <div key={p._id} className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition group">
              <Link to={`/products/${p._id}`}>
                <div className="aspect-[4/3] overflow-hidden bg-gray-50 dark:bg-gray-800">
                  <img src={p.images?.[0] || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image'}
                    alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                </div>
              </Link>
              <div className="p-4">
                <Link to={`/products/${p._id}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1">{p.name}</Link>
                <div className="flex items-center gap-1 mt-1 text-amber-400 text-xs">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill={i < Math.round(p.rating) ? 'currentColor' : 'none'} />)}
                  <span className="text-gray-400 dark:text-gray-500 ml-1">({p.numReviews})</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Price value={discountedPrice(p)} />
                  {p.discountPercent ? (
                    <span className="text-xs text-gray-400 line-through">${p.price.toFixed(2)}</span>
                  ) : p.comparePrice ? (
                    <span className="text-xs text-gray-400 line-through">${p.comparePrice}</span>
                  ) : null}
                  {p.discountPercent ? (
                    <span className="ml-auto text-[11px] font-semibold text-green-600 bg-green-50 dark:bg-green-900/40 rounded-full px-1.5 py-0.5">-{p.discountPercent}%</span>
                  ) : null}
                </div>
                <Button size="sm" className="w-full mt-3" onClick={() => handleAdd(p)} disabled={p.stock < 1}>
                  {p.stock < 1 ? 'Out of Stock' : 'Add to Cart'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
