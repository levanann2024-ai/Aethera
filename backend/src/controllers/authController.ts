import type { NextFunction, Request, Response } from 'express';
import { consumeCaptchaToken, createCaptchaChallenge } from '../services/captchaService.js';
import {
  getUserById,
  isTargetLanguage,
  loginUser,
  registerUser,
  updateUserTargetLanguage,
} from '../services/authService.js';

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === '23505';
}

export function getCaptcha(_req: Request, res: Response): void {
  res.json(createCaptchaChallenge());
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { full_name, email: rawEmail, password, captchaToken } = req.body ?? {};
  const targetLanguage = req.body?.target_language ?? 'tay';
  const email = normalizeEmail(rawEmail);

  if (typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.trim().length > 80) {
    res.status(400).json({ error: 'full_name must contain between 2 and 80 characters.' });
    return;
  }
  if (!email) {
    res.status(400).json({ error: 'A valid email address is required.' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    res.status(400).json({ error: 'password must contain between 8 and 128 characters.' });
    return;
  }
  if (!isTargetLanguage(targetLanguage)) {
    res.status(400).json({ error: 'target_language must be tay, muong, hmong, dao, or all.' });
    return;
  }
  if (!consumeCaptchaToken(captchaToken)) {
    res.status(400).json({ error: 'CAPTCHA is incorrect or expired. Please try a new challenge.' });
    return;
  }

  try {
    const result = await registerUser(full_name.trim(), email, password, targetLanguage);
    res.status(201).json(result);
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  if (!email || typeof password !== 'string' || !password) {
    res.status(400).json({ error: 'A valid email and password are required.' });
    return;
  }

  try {
    const result = await loginUser(email, password);
    if (!result) {
      res.status(401).json({ error: 'Email or password is incorrect.' });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserById(req.authUserId ?? '');
    if (!user) {
      res.status(401).json({ error: 'Account no longer exists.' });
      return;
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  const targetLanguage = req.body?.target_language;
  if (!isTargetLanguage(targetLanguage)) {
    res.status(400).json({ error: 'target_language must be tay, muong, hmong, dao, or all.' });
    return;
  }

  try {
    const user = await updateUserTargetLanguage(req.authUserId ?? '', targetLanguage);
    if (!user) {
      res.status(404).json({ error: 'Account no longer exists.' });
      return;
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
}
