import { Request, Response, NextFunction } from 'express';
import Notification from './notification.model';
import { sendSuccess, sendPaginated } from '../../shared/utils/ApiResponse';

export const getMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: req.user!.userId }).sort('-createdAt').skip(skip).limit(limit),
      Notification.countDocuments({ user: req.user!.userId }),
      Notification.countDocuments({ user: req.user!.userId, isRead: false }),
    ]);

    sendSuccess(res, { notifications, unreadCount, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

// VULNERABILITY (idor-notification): notifications carry a sequential public
// number (nid) — visible in any user's own notification list — and this
// endpoint looks the notification up by nid with NO ownership check, so any
// authenticated user can mark any other user's notification as read.
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const nid = Number(req.params.nid);
    if (!Number.isInteger(nid) || nid <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid notification id' });
    }
    const notification = await Notification.findOneAndUpdate(
      { nid },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    sendSuccess(res, notification, 'Marked as read');
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Notification.updateMany({ user: req.user!.userId, isRead: false }, { isRead: true });
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};
