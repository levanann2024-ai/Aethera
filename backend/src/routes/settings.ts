import { Router } from 'express';
import { getSettings, saveSettings } from '../controllers/settingsController.js';

const settingsRouter = Router();

settingsRouter.get('/', getSettings);
settingsRouter.put('/', saveSettings);

export default settingsRouter;
