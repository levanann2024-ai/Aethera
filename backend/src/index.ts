import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import apiRouter from './routes/api.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());
app.use('/api', apiRouter);

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error.' });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend example listening on port ${port}.`);
});
