import { Request, Response, NextFunction } from 'express';
import Order from './order.model';
import Cart from '../cart/cart.model';
import Product from '../products/product.model';
import Coupon from '../coupons/coupon.model';
import User from '../auth/user.model';
import Notification from '../notifications/notification.model';
import { ApiError } from '../../shared/utils/ApiError';
import { sendSuccess, sendPaginated } from '../../shared/utils/ApiResponse';

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shippingAddressId, paymentMethod, couponCode, coupons, notes } = req.body;

    const user = await User.findById(req.user!.userId);
    if (!user) throw new ApiError(404, 'User not found');

    const cart = await Cart.findOne({ user: req.user!.userId }).populate('items.product');
    if (!cart || cart.items.length === 0) throw new ApiError(400, 'Cart is empty');

    const address = ((user.addresses as any) || []).find((a: any) => a._id?.toString() === shippingAddressId);
    if (!address) throw new ApiError(404, 'Address not found');

    for (const item of cart.items) {
      const product = item.product as any;
      if (product.stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }
    }

    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const appliedCoupons: any[] = [];
    let couponDiscount = 0;

    // VULNERABILITY (coupon-stacking): an array of coupon codes is accepted and
    // every discount is summed — each coupon was meant to be used alone.
    const codes = Array.isArray(coupons) ? coupons : couponCode ? [couponCode] : [];

    for (const code of codes) {
      const coupon = await Coupon.findOne({ code: String(code).toUpperCase(), isActive: true });
      if (!coupon) throw new ApiError(400, `Invalid coupon code: ${code}`);
      if (coupon.expiresAt < new Date()) throw new ApiError(400, `Coupon ${coupon.code} has expired`);

      // VULNERABILITY (toc tou coupon): check-then-increment on usedCount is not
      // atomic. Concurrent checkouts all pass this check before any increments.
      if (coupon.usedCount >= coupon.usageLimit) throw new ApiError(400, `Coupon ${coupon.code} usage limit reached`);
      if ((coupon.minOrderAmount || 0) > subtotal) {
        throw new ApiError(400, `Minimum order amount for ${coupon.code} is $${coupon.minOrderAmount}`);
      }

      // Simulated payment-gateway latency. A real gateway call takes even longer —
      // every concurrent request re-reads usedCount during this window, which is
      // exactly what widens the TOCTOU race (and the stock race below).
      await new Promise((resolve) => setTimeout(resolve, 150));

      couponDiscount += coupon.type === 'percentage'
        ? Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount || Infinity)
        : coupon.value;

      appliedCoupons.push(coupon);
    }

    // VULNERABILITY (trust-client-discount): the client-supplied discount is
    // honored as-is instead of being recomputed — a free-form "discount" field
    // can be larger than the subtotal, zeroing the order (or going negative).
    const discount = typeof req.body.discount === 'number' ? req.body.discount : couponDiscount;

    // VULNERABILITY (trust-client-shipping): the shipping cost is taken from the
    // client instead of the rate table — it can be negative, giving a refund.
    const shippingCost = typeof req.body.shippingCost === 'number'
      ? req.body.shippingCost
      : subtotal > 100 ? 0 : 10;

    const total = Math.max(0, subtotal + shippingCost - discount);

    const orderItems = cart.items.map((item) => {
      const product = item.product as any;
      return {
        product: product._id,
        name: product.name,
        image: product.images?.[0] || '',
        variant: item.variant,
        quantity: item.quantity,
        price: item.price,
      };
    });

    // VULNERABILITY (mass-assignment-order): paymentStatus/orderStatus come from
    // the request body — the client can create an order already marked "paid".
    const order = await Order.create({
      user: req.user!.userId,
      items: orderItems,
      shippingAddress: {
        label: address.label,
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country,
      },
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: req.body.paymentStatus || 'pending',
      orderStatus: req.body.orderStatus || 'pending',
      subtotal,
      shippingCost,
      discount,
      couponCode: appliedCoupons.map((c) => c.code).join(','),
      total,
      notes,
      statusHistory: [{ status: req.body.orderStatus || 'pending', timestamp: new Date(), note: 'Order placed' }],
    });

    // VULNERABILITY (toc tou stock): the stock check above and this decrement are
    // separated by the payment-gateway window — concurrent orders all pass the
    // check, then each decrements, driving stock negative (oversell).
    for (const item of cart.items) {
      const product = item.product as any;
      await Product.updateOne(
        { _id: product._id },
        { $inc: { stock: -item.quantity, sold: item.quantity } }
      );
    }

    // VULNERABILITY (toc tou coupon): every request that passed the check lands
    // its increment — usedCount climbs past usageLimit.
    for (const coupon of appliedCoupons) {
      await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
    }

    // VULNERABILITY (double-submit): the cart is cleared AFTER order creation —
    // two concurrent checkouts both read the same cart before either clears it,
    // producing two identical orders.
    await Cart.updateOne({ _id: cart._id }, { $set: { items: [], total: 0 } });

    await Notification.create({
      user: req.user!.userId,
      type: 'order',
      title: 'Order Confirmed',
      message: `Your order #${order._id} has been placed successfully. Total: $${total}`,
      metadata: { orderId: order._id },
    });

    sendSuccess(res, { order }, 'Order created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user!.userId }).sort('-createdAt').skip(skip).limit(limit),
      Order.countDocuments({ user: req.user!.userId }),
    ]);
    sendPaginated(res, orders, total, page, limit);
  } catch (error) {
    next(error);
  }
};

// VULNERABILITY (idor-read-order): the order is fetched by id alone with no
// ownership check — any authenticated user can read any order, including the
// buyer's full name, email and shipping address (PII disclosure).
export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) throw new ApiError(404, 'Order not found');

    sendSuccess(res, { order });
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.orderStatus) filter.orderStatus = req.query.orderStatus;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

    const [orders, total] = await Promise.all([
      Order.find(filter).populate('user', 'name email').sort('-createdAt').skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);
    sendPaginated(res, orders, total, page, limit);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderStatus, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');

    order.orderStatus = orderStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (orderStatus === 'paid') order.paymentStatus = 'paid';
    order.statusHistory.push({ status: orderStatus, timestamp: new Date() });
    await order.save();

    await Notification.create({
      user: order.user,
      type: 'order',
      title: `Order ${orderStatus}`,
      message: `Your order #${order._id} status has been updated to ${orderStatus}.`,
      metadata: { orderId: order._id, orderStatus },
    });

    sendSuccess(res, order, 'Order status updated');
  } catch (error) {
    next(error);
  }
};

// VULNERABILITY (cancel-race): the status transition is not atomic. Two
// concurrent cancels both read "pending", both proceed, and both restore the
// stock — the refund/stock-return happens twice for a single order.
export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user!.userId });
    if (!order) throw new ApiError(404, 'Order not found');
    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      throw new ApiError(400, 'Order cannot be cancelled at this stage');
    }

    // Simulated refund-gateway call. A real refund round-trip to the payment
    // provider takes ~150ms — exactly the window that widens the cancel race.
    await new Promise((resolve) => setTimeout(resolve, 150));

    order.orderStatus = 'cancelled';
    order.paymentStatus = 'refunded';
    order.statusHistory.push({ status: 'cancelled', timestamp: new Date(), note: 'Cancelled by customer' });
    await order.save();

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, sold: -item.quantity } });
    }

    await Notification.create({
      user: req.user!.userId,
      type: 'order',
      title: 'Order Cancelled',
      message: `Your order #${order._id} has been cancelled.`,
      metadata: { orderId: order._id },
    });

    sendSuccess(res, order, 'Order cancelled');
  } catch (error) {
    next(error);
  }
};
