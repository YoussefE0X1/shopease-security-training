import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config';
import User from '../../modules/auth/user.model';
import { ApiError } from '../utils/ApiError';

export interface JwtPayload {
  userId: string;
  role: 'customer' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required'));
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    // The token only proves the session; the CURRENT role is always taken from
    // the database so a role change (e.g. demotion) takes effect immediately.
    const user = await User.findById(decoded.userId).select('role isActive').lean();
    if (!user) {
      return next(new ApiError(401, 'User no longer exists'));
    }
    if (!user.isActive) {
      return next(new ApiError(401, 'Account is deactivated'));
    }
    req.user = { userId: decoded.userId, role: user.role };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

// Sets req.user when a valid token is present but never rejects — for public
// endpoints that still need to know which user is logged in
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch {
      // ignore invalid tokens on public endpoints
    }
  }
  next();
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
};

// BFLA (stale-token role): trusts the `role` claim inside the JWT instead of
// re-reading the current role from the database. A user whose role was changed
// or revoked keeps accessing this endpoint until the token expires.
export const authorizeTokenRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(401, 'Authentication required'));
    }
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(authHeader.split(' ')[1], config.jwt.secret) as JwtPayload;
    } catch {
      return next(new ApiError(401, 'Invalid or expired token'));
    }
    req.user = decoded;
    if (!roles.includes(decoded.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
};
