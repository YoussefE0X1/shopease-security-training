import { Router } from 'express';
import { listChallenges, getChallenge } from './challenge.controller';

const router = Router();

router.get('/', listChallenges);
router.get('/:key', getChallenge);

export default router;