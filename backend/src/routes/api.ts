import { Router } from 'express';
import activityRouter from './activity.js';
import dictionaryRouter from './dictionary.js';
import settingsRouter from './settings.js';

const apiRouter = Router();

apiRouter.use('/dictionary', dictionaryRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/activity', activityRouter);

export default apiRouter;
