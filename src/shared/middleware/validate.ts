import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  message?: string;
}

export const validate = (rules: ValidationRule[], source: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = req[source];
    const errors: string[] = [];

    for (const rule of rules) {
      const value = data[rule.field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(rule.message || `${rule.field} is required`);
        continue;
      }

      if (value === undefined || value === null) continue;

      if (rule.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          errors.push(rule.message || `${rule.field} must be a valid email`);
          continue;
        }
      }

      if (rule.type === 'number' && typeof value !== 'number') {
        errors.push(rule.message || `${rule.field} must be a number`);
        continue;
      }

      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(rule.message || `${rule.field} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(rule.message || `${rule.field} must be at most ${rule.maxLength} characters`);
        }
      }

      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(rule.message || `${rule.field} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(rule.message || `${rule.field} must be at most ${rule.max}`);
        }
      }
    }

    if (errors.length > 0) {
      return next(new ApiError(400, errors.join(', ')));
    }

    next();
  };
};
