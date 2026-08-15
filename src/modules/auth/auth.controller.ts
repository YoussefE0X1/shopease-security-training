import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from './user.model';
import config from '../../config';
import { ApiError } from '../../shared/utils/ApiError';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import { JwtPayload } from '../../shared/middleware/auth';

const generateTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign({ userId, role }, config.jwt.secret, {
    expiresIn: config.jwt.expire as any,
  });
  const refreshToken = jwt.sign({ userId, role }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpire as any,
  });
  return { accessToken, refreshToken };
};

// VULNERABILITY (mass-assignment-register): the whole request body is passed to
// User.create, so an attacker can send { "role": "admin" } (or email, phone,
// isActive, ...) to register with escalated privileges.
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id, isProtected, ...safeBody } = req.body;
    const user = await User.create(safeBody);

    const tokens = generateTokens(user._id.toString(), user.role);

    sendSuccess(res, {
      user: { _id: user._id, id: user._id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    }, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (typeof password !== 'string') {
      throw new ApiError(400, 'Invalid password format');
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'Account is deactivated');
    }

    const tokens = generateTokens(user._id.toString(), user.role);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    sendSuccess(res, {
      user: { _id: user._id, id: user._id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// VULNERABILITY (refresh-token-rotation-race): the stored refresh token is
// compared, then replaced. Two concurrent requests carrying the SAME token both
// pass the comparison before either writes the new one — the old token stays
// usable (rotation is not enforced atomically).
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ApiError(400, 'Refresh token is required');

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;
    if (!decoded) throw new ApiError(401, 'Invalid refresh token');

    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user) throw new ApiError(401, 'Invalid refresh token');
    if (user.refreshToken !== refreshToken) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    // Simulated token-store round trip (~100ms) between the stored-token check
    // and the rotation write — the window that lets a replayed refresh token
    // be rotated twice (both concurrent refreshes pass the comparison).
    await new Promise((resolve) => setTimeout(resolve, 100));

    const tokens = generateTokens(user._id.toString(), user.role);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    sendSuccess(res, tokens, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

// VULNERABILITY (session-invalidation-incomplete): logout only clears the
// refresh token — the access token stays valid until natural expiry, so a
// "logged out" session can still call authenticated endpoints.
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.userId).select('+refreshToken');
    if (user) {
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
    }
    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.userId);
    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new ApiError(400, 'Current password and new password are required');
    if (newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters');

    const user = await User.findById(req.user!.userId).select('+password');
    if (!user) throw new ApiError(404, 'User not found');
    if (!(await user.comparePassword(currentPassword))) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    user.refreshToken = undefined;
    await user.save();

    sendSuccess(res, null, 'Password changed successfully. Please login again.');
  } catch (error) {
    next(error);
  }
};
