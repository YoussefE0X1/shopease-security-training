import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, ShoppingCart, Check, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Price } from '../components/ui/Price';
import { PageSpinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import SafeHtml from '../components/ui/SafeHtml';
import { formatDate } from '../utils/format';
import type { Product, Review } from '../types';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [variantPrice, setVariantPrice] = useState(0);
  const [variantStock, setVariantStock] = useState<number | null>(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { addItem } = useCart();
  const { showToast } = useToast();
  const { user: currentUser, isAdmin } = useAuth();

  useEffect(() => {
    Promise.all([
      api.get(`/products/${id}`),
      api.get(`/reviews/${id}`),
    ]).then(([p, r]) => {
      const prod = p.data.data;
      setProduct(prod);
      setReviews(r.data.data || []);
      if (prod.price) setVariantPrice(prod.price);
      if (prod.variants?.length) {
        const initial: Record<string, string> = {};
        prod.variants.forEach((v: any) => { initial[v.name] = v.options[0]?.label || ''; });
        setSelectedVariants(initial);
      }
    }).catch(() => showToast('Failed to load product', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const selectVariant = (vName: string, label: string) => {
    const updated = { ...selectedVariants, [vName]: label };
    setSelectedVariants(updated);
    if (!product) return;
    let price = product.price;
    let stock: number | null = null;
    let found = true;
    for (const v of product.variants || []) {
      const opt = v.options.find((o) => o.label === updated[v.name]);
      if (opt) { price += opt.priceAdjust; if (stock === null || opt.stock < stock) stock = opt.stock; }
      else found = false;
    }
    setVariantPrice(price);
    setVariantStock(found ? stock : null);
  };

  const handleAdd = async () => {
    if (!product) return;
    const variantEntries = Object.entries(selectedVariants);
    const variant = variantEntries.length > 0 ? { name: variantEntries[0][0], label: variantEntries[0][1] } : undefined;
    try { await addItem(product._id, 1, variant); showToast('Added to cart!', 'success'); }
    catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post(`/reviews/${id}`, { rating: reviewRating, comment: reviewComment });
      setReviews((prev) => [data.data.review, ...prev]);
      setReviewComment(''); setReviewRating(5);
      showToast('Review submitted!', 'success');
    } catch (err: any) { showToast(err?.message || err?.data?.message || 'Error', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
      showToast('Review deleted', 'success');
      api.get(`/products/${id}`).then((p) => setProduct(p.data.data)).catch(() => {});
    } catch (err: any) { showToast(err?.message || 'Error', 'error'); }
  };

  const currentStock = variantStock ?? product?.stock ?? 0;

  const myUserId = currentUser?._id || (currentUser as { id?: string } | null)?.id;

  if (loading) return <PageSpinner />;
  if (!product) return <div className="text-center py-20 text-gray-500 dark:text-gray-400">Product not found</div>;

  return (
    <div>
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
        <ArrowLeft size={16} /> Back to Shop
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 mb-3 relative group cursor-pointer"
            onClick={() => setLightbox(true)}>
            <img src={product.images?.[selectedImage] || 'https://placehold.co/600x600/e2e8f0/64748b?text=No+Image'}
              alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
              <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">Click to enlarge</span>
            </div>
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button key={i}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition cursor-pointer ${i === selectedImage ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400'}`}
                  onClick={() => setSelectedImage(i)}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{product.name}</h1>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex text-amber-400">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill={i < Math.round(product.rating) ? 'currentColor' : 'none'} />)}</div>
            <span className="text-sm text-gray-500 dark:text-gray-400">({product.numReviews} reviews)</span>
          </div>

          <div className="flex items-baseline gap-3 mb-4">
            <Price value={variantPrice} className="text-3xl" />
            {product.comparePrice && <span className="text-lg text-gray-400 line-through">${product.comparePrice}</span>}
          </div>

          <SafeHtml html={product.description} className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6" />

          {(product.variants || []).length > 0 && (product.variants || []).map((v) => (
            <div key={v.name} className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{v.name}: <span className="text-indigo-600 dark:text-indigo-400">{selectedVariants[v.name]}</span></p>
              <div className="flex flex-wrap gap-2">
                {v.options.map((opt) => {
                  const isSelected = selectedVariants[v.name] === opt.label;
                  return (
                    <button key={opt.label}
                      className={`px-4 py-2 text-sm rounded-lg border transition cursor-pointer ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'}`}
                      onClick={() => selectVariant(v.name, opt.label)}>
                      {opt.label} {opt.priceAdjust !== 0 && <span className={opt.priceAdjust > 0 ? 'text-red-400' : 'text-green-400'}>{opt.priceAdjust > 0 ? '+' : ''}{opt.priceAdjust}$</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2 mb-6">
            {product.tags?.map((t) => <span key={t} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-300">#{t}</span>)}
          </div>

          <div className="flex items-center gap-6 mb-6 text-sm">
            <span className={`font-medium ${currentStock > 10 ? 'text-green-600' : currentStock > 0 ? 'text-amber-600' : 'text-red-600'}`}>
              {currentStock > 10 ? '✓ In Stock' : currentStock > 0 ? `Only ${currentStock} left` : 'Out of Stock'}
            </span>
            <span className="text-gray-500 dark:text-gray-400">{product.sold} sold</span>
          </div>

          <Button size="lg" onClick={handleAdd} disabled={currentStock < 1} className="w-full sm:w-auto">
            <ShoppingCart size={18} /> {currentStock < 1 ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </div>

      <Modal open={lightbox} onClose={() => setLightbox(false)} maxWidth="max-w-4xl">
        <div className="relative">
          <img src={product.images?.[selectedImage] || ''} alt={product.name} className="w-full rounded-lg" />
          {product.images && product.images.length > 1 && (
            <div className="flex justify-center gap-4 mt-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedImage((i) => (i - 1 + product.images!.length) % product.images!.length)}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm text-gray-500 self-center">{selectedImage + 1} / {product.images.length}</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedImage((i) => (i + 1) % product.images!.length)}>
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <div className="border-t dark:border-gray-700 pt-8">
        <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100">Customer Reviews ({reviews.length})</h2>

        <form onSubmit={handleReview} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-5 mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Your Rating:</span>
            {[1, 2, 3, 4, 5].map((r) => (
              <button key={r} type="button" onClick={() => setReviewRating(r)} className="text-amber-400 cursor-pointer p-0.5 hover:scale-110 transition">
                <Star size={22} fill={r <= reviewRating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <textarea className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" rows={3}
            placeholder="Share your thoughts about this product..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} required />
          <Button type="submit" size="sm" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Review'}</Button>
        </form>

        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r._id} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-sm font-medium">
                    {r.user?.name?.[0] || '?'}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.user?.name || 'Anonymous'}</span>
                    {r.isVerifiedPurchase && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                        <Check size={10} /> Verified Purchase
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(r.createdAt)}</span>
              </div>
              <div className="flex text-amber-400 text-xs mb-2">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill={i < r.rating ? 'currentColor' : 'none'} />)}
              </div>
              {r.title && <p className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">{r.title}</p>}
              <div className="flex items-start justify-between gap-3">
                <SafeHtml html={r.comment || ''} className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-1" />
                {currentUser && (r.user?._id === myUserId || isAdmin) && (
                  <button
                    onClick={() => handleDeleteReview(r._id)}
                    className="shrink-0 text-gray-400 hover:text-red-500 transition cursor-pointer"
                    title={isAdmin ? 'Delete this review' : 'Delete your review'}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {reviews.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700">
              <Star size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No reviews yet. Be the first to review this product!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
