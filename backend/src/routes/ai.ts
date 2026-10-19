import { Router } from 'express';
import { postChat } from '../controllers/aiController.js';

const aiRouter = Router();

aiRouter.post('/chat', postChat);

export default aiRouter;
