export async function synthesizeSpeech(_text: string): Promise<never> {
  throw new Error('TTS provider is not configured.');
}
