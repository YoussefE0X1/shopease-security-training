import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getMongoUri, stopEmbeddedMongo } from '../config/embeddedMongo';
import User from '../modules/auth/user.model';
import Product from '../modules/products/product.model';
import Category from '../modules/categories/category.model';
import Cart from '../modules/cart/cart.model';
import Order from '../modules/orders/order.model';
import Review from '../modules/reviews/review.model';
import Coupon from '../modules/coupons/coupon.model';
import Notification, { NotificationCounter } from '../modules/notifications/notification.model';
import Challenge from '../modules/challenges/challenge.model';

dotenv.config();

// Full reset: wipes all collections (including the challenges catalog),
// then re-seeds the application data.
const run = async () => {
  try {
    await mongoose.connect(await getMongoUri());
    console.log('Connected to MongoDB');

    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Category.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
      Review.deleteMany({}),
      Coupon.deleteMany({}),
      Notification.deleteMany({}),
      NotificationCounter.deleteMany({}),
      Challenge.deleteMany({}),
    ]);
    console.log('Database wiped');

    // Re-seed everything (each seed connects/disconnects on its own)
    await import('./data.seed').then((m) => m.run());
    await import('./challenges.seed').then((m) => m.run());

    console.log('Reset complete');
    await mongoose.disconnect();
    await stopEmbeddedMongo();
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  }
};

run();
