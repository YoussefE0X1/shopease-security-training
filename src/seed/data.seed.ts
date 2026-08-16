import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getMongoUri, stopEmbeddedMongo } from '../config/embeddedMongo';
import User from '../modules/auth/user.model';
import Category from '../modules/categories/category.model';
import Product from '../modules/products/product.model';
import Coupon from '../modules/coupons/coupon.model';
import Cart from '../modules/cart/cart.model';
import Review from '../modules/reviews/review.model';
import Order from '../modules/orders/order.model';
import Notification, { NotificationCounter } from '../modules/notifications/notification.model';

dotenv.config();

const categoriesData = [
  { name: 'Electronics', slug: 'electronics', description: 'Gadgets and devices' },
  { name: 'Clothing', slug: 'clothing', description: 'Fashion and apparel' },
  { name: 'Books', slug: 'books', description: 'Books and literature' },
  { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Home essentials' },
  { name: 'Sports', slug: 'sports', description: 'Sports equipment' },
];

const productsData = [
  {
    name: 'Wireless Headphones Pro',
    slug: 'wireless-headphones-pro',
    description: 'Premium noise-cancelling wireless headphones with 30h battery life.',
    price: 149.99, comparePrice: 199.99,
    tags: ['audio', 'wireless', 'headphones'],
    stock: 50, isFeatured: true,
  },
  {
    name: 'Smart Watch Series X',
    slug: 'smart-watch-series-x',
    description: 'Fitness tracker with heart-rate monitor and GPS.',
    price: 249.99, comparePrice: 299.99,
    tags: ['wearable', 'fitness'],
    stock: 30, isFeatured: true,
  },
  {
    name: 'Mechanical Keyboard RGB',
    slug: 'mechanical-keyboard-rgb',
    description: 'Hot-swappable mechanical keyboard with RGB backlight.',
    price: 89.99,
    tags: ['keyboard', 'gaming', 'peripheral'],
    stock: 80, isFeatured: false,
  },
  {
    name: 'Classic Cotton T-Shirt',
    slug: 'classic-cotton-t-shirt',
    description: '100% cotton t-shirt, available in all sizes.',
    price: 19.99, comparePrice: 29.99,
    tags: ['tshirt', 'cotton', 'basic'],
    variants: [
      { name: 'Size', options: [{ label: 'S', priceAdjust: 0, stock: 20 }, { label: 'M', priceAdjust: 0, stock: 25 }, { label: 'L', priceAdjust: 0, stock: 15 }] },
      { name: 'Color', options: [{ label: 'Black', priceAdjust: 0, stock: 30 }, { label: 'White', priceAdjust: 0, stock: 30 }] },
    ],
    stock: 60, isFeatured: false,
  },
  {
    name: 'JavaScript: The Definitive Guide',
    slug: 'javascript-definitive-guide',
    description: 'The complete reference for JavaScript developers.',
    price: 45.0,
    tags: ['javascript', 'programming', 'book'],
    stock: 100, isFeatured: true,
  },
  {
    name: 'The Web Application Hacker\'s Handbook',
    slug: 'web-hackers-handbook',
    description: 'Classic reference on web application security testing.',
    price: 55.0,
    tags: ['security', 'hacking', 'book', 'pentest'],
    stock: 40, isFeatured: true,
  },
  {
    name: 'Stainless Steel Water Bottle',
    slug: 'stainless-water-bottle',
    description: 'Insulated 1L water bottle, keeps drinks cold for 24h.',
    price: 24.99,
    tags: ['bottle', 'hydration'],
    stock: 200, isFeatured: false,
  },
  {
    name: 'Yoga Mat Premium',
    slug: 'yoga-mat-premium',
    description: 'Non-slip eco-friendly yoga mat with carry strap.',
    price: 34.99, comparePrice: 44.99,
    tags: ['yoga', 'fitness', 'sports'],
    stock: 75, isFeatured: false,
  },
  {
    name: 'Espresso Machine Deluxe',
    slug: 'espresso-machine-deluxe',
    description: '15-bar espresso machine with milk frother.',
    price: 329.99,
    tags: ['coffee', 'kitchen', 'appliance'],
    stock: 15, isFeatured: false,
  },
  {
    name: 'Running Shoes AirMax',
    slug: 'running-shoes-airmax',
    description: 'Lightweight running shoes with cushioned sole.',
    price: 119.99, comparePrice: 149.99,
    tags: ['shoes', 'running', 'sports'],
    variants: [
      { name: 'Size', options: [{ label: '42', priceAdjust: 0, stock: 10 }, { label: '43', priceAdjust: 0, stock: 12 }, { label: '44', priceAdjust: 0, stock: 8 }] },
    ],
    stock: 30, isFeatured: false,
  },
  {
    name: 'Gaming Mouse Wireless',
    slug: 'gaming-mouse-wireless',
    description: '16000 DPI wireless gaming mouse with low latency.',
    price: 59.99,
    tags: ['gaming', 'mouse', 'peripheral'],
    stock: 90, isFeatured: false,
  },
  {
    name: 'Laptop Stand Aluminum',
    slug: 'laptop-stand-aluminum',
    description: 'Adjustable aluminum laptop stand with ergonomic angle.',
    price: 29.99,
    tags: ['laptop', 'desk', 'accessory'],
    stock: 120, isFeatured: false,
  },
];

export const run = async () => {
  try {
    await mongoose.connect(await getMongoUri());
    console.log('Connected to MongoDB');

    // Drop obsolete indexes (e.g. the old unique user+product review index)
    await Review.syncIndexes();

    await User.deleteMany({});
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@shop.com',
      password: 'admin123',
      role: 'admin',
      isProtected: true,
      internalNotes: 'VIP account — payment issues flagged Q2, do not close',
      addresses: [{ label: 'Home', street: '1 Main St', city: 'Cairo', state: 'Cairo', zip: '11511', country: 'Egypt', isDefault: true }],
    });
    const john = await User.create({
      name: 'John Doe',
      email: 'john@test.com',
      password: 'user123',
      internalNotes: 'Suspected chargeback fraud — review before refunds',
      addresses: [{ label: 'Home', street: '42 Second Ave', city: 'Alexandria', state: 'Alex', zip: '21500', country: 'Egypt', isDefault: true }],
    });
    console.log('Seeded users: admin@shop.com / admin123, john@test.com / user123');

    await Category.deleteMany({});
    const categories = await Category.insertMany(categoriesData);
    console.log(`Seeded ${categories.length} categories`);

    // Products — internal fields (costPrice / internalNotes) are seeded here and
    // returned by the product API (BOPLA: they should be admin-only).
    await Product.deleteMany({});
    const products = productsData.map((p, index) => ({
      ...p,
      category: categories[index % categories.length]._id,
      images: [],
      costPrice: Math.round(p.price * 0.62 * 100) / 100,
      internalNotes: `margin ${Math.round(38 + (index % 5) * 3)}% — renegotiate with supplier ${'ABCDE'[index % 5]} in Q4`,
    }));
    const seededProducts = await Product.insertMany(products);
    console.log(`Seeded ${seededProducts.length} products`);

    // Coupons — including "personal" codes with a PREDICTABLE pattern
    // (PERSONAL-<userId>) that are never bound to their owner: any user can
    // redeem anyone else's personal coupon.
    await Coupon.deleteMany({});
    await Coupon.insertMany([
      { code: 'WELCOME10', type: 'percentage', value: 10, minOrderAmount: 50, usageLimit: 50, usedCount: 0, expiresAt: new Date('2027-12-31'), isActive: true },
      { code: 'SAVE20', type: 'fixed', value: 20, minOrderAmount: 100, usageLimit: 50, usedCount: 0, expiresAt: new Date('2027-12-31'), isActive: true },
      { code: 'FREESHIP', type: 'fixed', value: 10, minOrderAmount: 0, usageLimit: 50, usedCount: 0, expiresAt: new Date('2027-12-31'), isActive: true },
      { code: 'NEW50', type: 'fixed', value: 50, minOrderAmount: 0, usageLimit: 3, usedCount: 0, expiresAt: new Date('2027-12-31'), isActive: true },
      { code: 'TEST20', type: 'fixed', value: 20, minOrderAmount: 0, usageLimit: 10, usedCount: 0, expiresAt: new Date('2027-12-31'), isActive: true },
      { code: `PERSONAL-${admin._id}`, type: 'percentage', value: 25, minOrderAmount: 0, usageLimit: 1, usedCount: 0, expiresAt: new Date('2027-12-31'), isActive: true },
      { code: `PERSONAL-${john._id}`, type: 'percentage', value: 25, minOrderAmount: 0, usageLimit: 1, usedCount: 0, expiresAt: new Date('2027-12-31'), isActive: true },
    ]);
    console.log('Seeded 7 coupons (2 personal, unbound)');

    await Cart.deleteMany({});
    await Review.deleteMany({});
    await Order.deleteMany({});
    await Notification.deleteMany({});
    await NotificationCounter.deleteMany({});
    console.log('Cleared carts, reviews, orders, notifications');

    await Cart.create({ user: john._id, items: [], total: 0 });

    console.log('Data seed complete');
    await mongoose.disconnect();
    await stopEmbeddedMongo();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

// Auto-run only when executed directly (npm run seed:data), not when imported
// by reset.seed.ts
if (require.main === module) {
  run();
}
