import { randomInt, randomUUID } from 'node:crypto';

const CAPTCHA_LIFETIME_MS = 5 * 60 * 1000;
const MAX_ACTIVE_CHALLENGES = 10_000;
const challenges = new Map<string, { answer: number; expiresAt: number }>();

export function createCaptchaChallenge(): { captchaToken: string; question: string } {
  const now = Date.now();
  for (const [token, challenge] of challenges) {
    if (challenge.expiresAt <= now) challenges.delete(token);
  }
  while (challenges.size >= MAX_ACTIVE_CHALLENGES) {
    const oldestToken = challenges.keys().next().value;
    if (!oldestToken) break;
    challenges.delete(oldestToken);
  }

  const left = randomInt(1, 10);
  const right = randomInt(1, 10);
  const captchaToken = randomUUID();
  challenges.set(captchaToken, { answer: left + right, expiresAt: now + CAPTCHA_LIFETIME_MS });

  return { captchaToken, question: `${left} + ${right} = ?` };
}

export function consumeCaptchaToken(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const separator = value.lastIndexOf('.');
  if (separator <= 0) return false;

  const token = value.slice(0, separator);
  const answerText = value.slice(separator + 1);
  const challenge = challenges.get(token);
  challenges.delete(token);

  return challenge !== undefined
    && challenge.expiresAt > Date.now()
    && /^\d{1,2}$/.test(answerText)
    && Number(answerText) === challenge.answer;
}
