export type TargetLanguage = 'tay' | 'muong' | 'hmong' | 'dao' | 'all';

export type User = {
  id: string;
  email: string;
  name: string;
  targetLanguage: TargetLanguage;
  preferredLanguage: TargetLanguage;
};
