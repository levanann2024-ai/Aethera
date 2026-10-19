import { Router } from 'express';
import aiRouter from './ai.js';
import activityRouter from './activity.js';
import authRouter from './auth.js';
import dictionaryRouter from './dictionary.js';
import settingsRouter from './settings.js';

const apiRouter = Router();

apiRouter.use('/ai', aiRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/dictionary', dictionaryRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/activity', activityRouter);

export default apiRouter;
