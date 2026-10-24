import 'dotenv/config';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import apiRouter from './routes/api.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const allowedOrigins = (process.env.FRONTEND_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use('/api/ai/image-translate', express.json({ limit: '12mb' }));
app.use('/api/ai/transcribe', express.json({ limit: '3mb' }));
app.use(express.json());
app.use('/api', apiRouter);

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  const isPayloadTooLarge = typeof error === 'object'
    && error !== null
    && 'type' in error
    && error.type === 'entity.too.large';
  const isImageTranslationRequest = _req.path.startsWith('/api/ai/image-translate');
  res.status(isPayloadTooLarge ? 413 : 500).json({
    error: isPayloadTooLarge
      ? isImageTranslationRequest ? 'Ảnh vượt quá dung lượng cho phép.' : 'Bản ghi âm vượt quá dung lượng cho phép.'
      : 'Internal server error.',
  });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend example listening on port ${port}.`);
});
