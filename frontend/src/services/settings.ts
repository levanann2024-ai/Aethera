export type DefaultLanguage = 'tay' | 'muong';
export type TextScale = 'normal' | 'large' | 'xlarge';
export type VoiceSpeed = 'slow' | 'normal' | 'fast';
export type Settings = { defaultLanguage: DefaultLanguage; textScale: TextScale; voiceSpeed: VoiceSpeed; reduceMotion: boolean };

const KEY = 'aethera.settings';
const defaults: Settings = { defaultLanguage: 'tay', textScale: 'normal', voiceSpeed: 'normal', reduceMotion: false };
const voiceRates: Record<VoiceSpeed, number> = { slow: 0.75, normal: 1, fast: 1.25 };

export function getSettings(): Settings {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>;
    return {
      defaultLanguage: parsed.defaultLanguage === 'muong' ? 'muong' : 'tay',
      textScale: parsed.textScale === 'large' || parsed.textScale === 'xlarge' ? parsed.textScale : 'normal',
      voiceSpeed: parsed.voiceSpeed === 'slow' || parsed.voiceSpeed === 'fast' ? parsed.voiceSpeed : 'normal',
      reduceMotion: parsed.reduceMotion === true,
    };
  } catch {
    return defaults;
  }
}

export function applySettings(settings: Settings = getSettings()) {
  const root = document.documentElement;
  root.dataset.textScale = settings.textScale;
  root.dataset.reduceMotion = settings.reduceMotion ? 'on' : 'off';
}

export function saveSettings(next: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Settings still apply for this session even if they cannot be stored.
  }
  applySettings(next);
}

export function voiceRate(): number {
  return voiceRates[getSettings().voiceSpeed];
}
