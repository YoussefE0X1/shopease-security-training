import { Request, Response, NextFunction } from 'express';
import User from '../auth/user.model';
import Product from '../products/product.model';
import Order from '../orders/order.model';
import { sendSuccess } from '../../shared/utils/ApiResponse';export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, totalProducts, totalOrders, revenueResult] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    const monthlyRevenue = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' }, createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]);

    const topProducts = await Product.find({ isActive: true }).sort('-sold').limit(5).select('name sold price images');

    sendSuccess(res, {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: revenueResult[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      ordersByStatus: ordersByStatus.map((o) => ({ status: o._id, count: o.count })),
      topProducts,
    });
  } catch (error) {
    next(error);
  }
};

export const exportOrders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort('-createdAt')
      .select('user items total paymentStatus orderStatus shippingAddress createdAt')
      .lean();
    sendSuccess(res, { exportedAt: new Date().toISOString(), count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};
