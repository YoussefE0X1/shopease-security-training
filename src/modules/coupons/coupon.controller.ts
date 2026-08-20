import { Request, Response, NextFunction } from 'express';
import Coupon from './coupon.model';
import { ApiError } from '../../shared/utils/ApiError';
import { sendSuccess } from '../../shared/utils/ApiResponse';

export const createCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, type, value, minOrderAmount, maxDiscount, usageLimit, expiresAt, userIds, userId } = req.body;

    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) throw new ApiError(400, `Coupon code "${code.toUpperCase()}" already exists`);

    // A coupon can be created as general (no users) or user-scoped: bound to
    // one or more specific users at creation via userIds (e.g. PERSONAL-<id>,
    // or a shared code granted to a small group of users).
    const scope = userIds || (userId ? [userId] : []);
    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      type,
      value,
      minOrderAmount,
      maxDiscount,
      usageLimit: usageLimit || 1,
      expiresAt: new Date(expiresAt),
      userIds: scope,
    });
    sendSuccess(res, coupon, 'Coupon created', 201);
  } catch (error) {
    next(error);
  }
};

export const getCoupons = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await Coupon.find().sort('-createdAt');
    sendSuccess(res, coupons);
  } catch (error) {
    next(error);
  }
};

export const validateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, orderTotal } = req.body;

    // VULNERABILITY (idor-personal-coupon): user-scoped coupons are bound to
    // their owners in the data model (userIds), but validation looks the
    // coupon up by code alone — ownership is never verified. Any user can
    // validate and redeem anyone else's personal coupon.
    const coupon = await Coupon.findOne({ code: String(code).toUpperCase(), isActive: true });
    if (!coupon) throw new ApiError(400, 'Invalid coupon code');
    if (coupon.expiresAt < new Date()) throw new ApiError(400, 'Coupon has expired');
    if (coupon.usedCount >= coupon.usageLimit) throw new ApiError(400, 'Coupon usage limit reached');
    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
      throw new ApiError(400, `Minimum order amount is $${coupon.minOrderAmount}`);
    }

    const discount = coupon.type === 'percentage'
      ? Math.min(orderTotal * (coupon.value / 100), coupon.maxDiscount || Infinity)
      : coupon.value;

    sendSuccess(res, { coupon, discount }, 'Coupon is valid');
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    sendSuccess(res, null, 'Coupon deleted');
  } catch (error) {
    next(error);
  }
};
