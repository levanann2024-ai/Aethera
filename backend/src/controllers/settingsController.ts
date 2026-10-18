import type { Request, Response } from 'express';

export function getSettings(_req: Request, res: Response) {
  res.status(501).json({ error: 'Settings storage is not configured yet.' });
}

export function saveSettings(_req: Request, res: Response) {
  res.status(501).json({ error: 'Settings storage is not configured yet.' });
}
