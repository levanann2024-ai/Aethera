import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const MAX_AUDIO_BASE64_LENGTH = Math.ceil(MAX_AUDIO_BYTES / 3) * 4;
const MODEL = 'gemini-3.6-flash';

type SourceLanguage = 'tay' | 'muong';

function isSourceLanguage(value: unknown): value is SourceLanguage {
  return value === 'tay' || value === 'muong';
}

export async function postTranscription(req: Request, res: Response): Promise<void> {
  const body: unknown = req.body;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    res.status(400).json({ error: 'Yêu cầu không hợp lệ.' });
    return;
  }

  const { audioBase64, mimeType, language, reverseDirection } = body as Record<string, unknown>;
  if (
    typeof audioBase64 !== 'string'
    || !audioBase64
    || audioBase64.length > MAX_AUDIO_BASE64_LENGTH
    || audioBase64.length % 4 !== 0
    || !/^[A-Za-z0-9+/]*={0,2}$/.test(audioBase64)
    || mimeType !== 'audio/wav'
    || !isSourceLanguage(language)
    || typeof reverseDirection !== 'boolean'
  ) {
    res.status(400).json({ error: 'Bản ghi âm không hợp lệ. Hãy ghi âm lại rồi thử lại.' });
    return;
  }

  const audio = Buffer.from(audioBase64, 'base64');
  if (audio.length <= 44 || audio.length > MAX_AUDIO_BYTES || audio.toString('base64') !== audioBase64) {
    res.status(400).json({ error: 'Bản ghi âm không hợp lệ. Hãy ghi âm lại rồi thử lại.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({ error: 'Dịch vụ nhận dạng giọng nói chưa được cấu hình. Cần GEMINI_API_KEY ở backend.' });
    return;
  }

  const inputLanguage = reverseDirection ? 'tiếng Việt' : language === 'tay' ? 'tiếng Tày' : 'tiếng Mường';

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{
        role: 'user',
        parts: [
          { text: `Chép lại chính xác lời nói bằng ${inputLanguage}. Giữ nguyên ngôn ngữ, không dịch, không giải thích. Chỉ trả về phần lời nói đã nhận dạng; nếu không có lời nói thì trả về chuỗi rỗng.` },
          { inlineData: { mimeType: 'audio/wav', data: audio.toString('base64') } },
        ],
      }],
    });

    res.json({ transcript: result.text?.trim() ?? '' });
  } catch (error) {
    console.error('Gemini speech transcription failed.', error);
    res.status(502).json({ error: 'Không thể nhận diện giọng nói lúc này. Vui lòng thử lại.' });
  }
}
