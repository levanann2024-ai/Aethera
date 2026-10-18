import type { NextFunction, Request, Response } from 'express';
import { addVocabularyEntry, searchVocabulary } from '../services/dictionaryService.js';
import type { SearchDirection, SourceLanguage } from '../models/vocabularyModel.js';

function isSourceLanguage(value: unknown): value is SourceLanguage {
  return value === 'tay' || value === 'muong';
}

function isSearchDirection(value: unknown): value is SearchDirection {
  return value === 'tay-to-viet' || value === 'viet-to-tay';
}

export async function getDictionary(req: Request, res: Response, next: NextFunction) {
  const language = req.query.language;
  if (!isSourceLanguage(language)) {
    res.status(400).json({ error: 'language must be "tay" or "muong".' });
    return;
  }

  const direction = req.query.direction ?? 'tay-to-viet';
  if (!isSearchDirection(direction)) {
    res.status(400).json({ error: 'direction must be "tay-to-viet" or "viet-to-tay".' });
    return;
  }

  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    res.json(await searchVocabulary(language, query, direction));
  } catch (error) {
    next(error);
  }
}

export async function postDictionaryEntry(req: Request, res: Response, next: NextFunction) {
  const { source_language, source_term, meaning, part_of_speech, example } = req.body ?? {};
  if (
    source_language !== 'tay'
    || typeof source_term !== 'string'
    || !source_term.trim()
    || typeof meaning !== 'string'
    || !meaning.trim()
  ) {
    res.status(400).json({ error: 'Tày source_language, source_term, and meaning are required.' });
    return;
  }

  try {
    const entry = await addVocabularyEntry({
      sourceLanguage: source_language,
      sourceTerm: source_term.trim(),
      meaning: meaning.trim(),
      partOfSpeech: typeof part_of_speech === 'string' ? part_of_speech.trim() : '',
      example: typeof example === 'string' ? example.trim() : '',
    });
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
}
