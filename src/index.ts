// src/index.ts
import express from 'express';
import { getEnvConfig } from './config/env.js';
import webhookRouter from './routes/webhook.js';
import logger from './logger.js';

const app = express();
const { port } = getEnvConfig();

// Middleware
app.use(express.json());

// Routes
app.use('/', webhookRouter);

// Error handling middleware
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error('Unhandled error', { error: err.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
);

// Start server
app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
