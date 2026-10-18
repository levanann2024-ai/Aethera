import { Router } from 'express';
import { getDictionary, postDictionaryEntry } from '../controllers/dictionaryController.js';

const dictionaryRouter = Router();

dictionaryRouter.get('/', getDictionary);
dictionaryRouter.post('/', postDictionaryEntry);

export default dictionaryRouter;
