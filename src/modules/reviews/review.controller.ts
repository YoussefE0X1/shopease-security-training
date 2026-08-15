import { Request, Response, NextFunction } from 'express';
import Review from './review.model';
import Product from '../products/product.model';
import Order from '../orders/order.model';
import { ApiError } from '../../shared/utils/ApiError';
import { sendSuccess, sendPaginated } from '../../shared/utils/ApiResponse';

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rating, title, comment, images } = req.body;
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

    const hasOrdered = await Order.findOne({
      user: req.user!.userId,
      'items.product': productId,
      orderStatus: { $in: ['delivered', 'shipped'] },
    });
    const isVerifiedPurchase = !!hasOrdered;

    const storedComment = escapeHtml(comment || '');

    const review = await Review.create({
      user: req.user!.userId as any,
      product: productId as any,
      rating,
      title,
      comment: storedComment,
      images: images || [],
      isVerifiedPurchase,
    });
    await review.populate('user', 'name avatar');

    const stats = await Review.aggregate([
      { $match: { product: product._id } },
      { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    if (stats.length > 0) {
      product.rating = Math.round(stats[0].avgRating * 10) / 10;
      product.numReviews = stats[0].count;
      await product.save();
    }

    sendSuccess(res, { review }, 'Review created', 201);
  } catch (error) {
    next(error);
  }
};

export const getProductReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ product: req.params.productId })
        .populate('user', 'name avatar')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ product: req.params.productId }),
    ]);
    sendPaginated(res, reviews, total, page, limit);
  } catch (error) {
    next(error);
  }
};

// VULNERABILITY (idor-delete-review): no ownership check — any authenticated
// user can delete any review by id.
export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) throw new ApiError(404, 'Review not found');

    const productId = review.product;
    await Review.findByIdAndDelete(req.params.id);

    const stats = await Review.aggregate([
      { $match: { product: productId } },
      { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    await Product.findByIdAndUpdate(productId, {
      rating: stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0,
      numReviews: stats.length > 0 ? stats[0].count : 0,
    });

    sendSuccess(res, null, 'Review deleted');
  } catch (error) {
    next(error);
  }
};
