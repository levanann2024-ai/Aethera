import { Router } from 'express';
import { getCaptcha, login, me, register, updatePreferences } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const authRouter = Router();

authRouter.get('/captcha', getCaptcha);
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', authMiddleware, me);
authRouter.patch('/me', authMiddleware, updatePreferences);

export default authRouter;
