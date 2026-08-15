import { Request, Response, NextFunction } from 'express';
import Challenge from './challenge.model';
import { ApiError } from '../../shared/utils/ApiError';
import { sendSuccess } from '../../shared/utils/ApiResponse';

// GET /api/challenges — catalog of every vulnerability shipped in the app
export const listChallenges = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const challenges = await Challenge.find().sort({ difficulty: 1 });
    sendSuccess(res, challenges);
  } catch (error) {
    next(error);
  }
};

// GET /api/challenges/:key — single vulnerability entry
export const getChallenge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challenge = await Challenge.findOne({ key: req.params.key });
    if (!challenge) throw new ApiError(404, 'Challenge not found');
    sendSuccess(res, challenge);
  } catch (error) {
    next(error);
  }
};