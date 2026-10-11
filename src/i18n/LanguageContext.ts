import { createContext } from 'react';

export type UiLanguage = 'vi' | 'en';

export type LanguageContextValue = {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: (text: string) => string;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);
