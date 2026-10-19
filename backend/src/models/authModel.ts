export type TargetLanguage = 'tay' | 'muong' | 'hmong' | 'dao' | 'all';

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  target_language: TargetLanguage;
}
