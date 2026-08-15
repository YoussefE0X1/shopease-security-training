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

// VULNERABILITY (idor-notification): the list endpoint is scoped to the caller,
// but this one is not — any notification can be read/marked by any user by id.
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
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
