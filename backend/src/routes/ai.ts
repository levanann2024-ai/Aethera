import { Router } from 'express';
import { postChat } from '../controllers/aiController.js';
import { postImageTranslation } from '../controllers/imageTranslationController.js';
import { postTranscription } from '../controllers/transcriptionController.js';

const aiRouter = Router();

aiRouter.post('/chat', postChat);
aiRouter.post('/image-translate', postImageTranslation);
aiRouter.post('/transcribe', postTranscription);

export default aiRouter;
