import { Router } from 'express';

const activityRouter = Router();

activityRouter.all('/', (_req, res) => {
  res.status(501).json({ error: 'Activity storage is not configured yet.' });
});

export default activityRouter;
