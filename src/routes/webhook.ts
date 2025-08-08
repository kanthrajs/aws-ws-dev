// src/routes/webhook.ts
import express from 'express';
import { getEnvConfig } from '../config/env.js';
import { processWebhookMessage } from '../state/state-manager.js';
import { type WhatsAppWebhookPayload } from '../interfaces/whatsapp.js';
import logger from '../logger.js';

const router = express.Router();
const { verifyToken } = getEnvConfig();

/**
 * Webhook verification endpoint (GET).
 */
router.get('/', (req, res) => {
  const {
    'hub.mode': mode,
    'hub.challenge': challenge,
    'hub.verify_token': token,
  } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    logger.warn('Webhook verification failed');
    res.status(403).end();
  }
});

/**
 * Webhook message processing endpoint (POST).
 */
router.post(
  '/',
  async (
    req: express.Request<unknown, unknown, WhatsAppWebhookPayload>,
    res
  ) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    logger.info(`Webhook received at ${timestamp}`, { payload: req.body });

    if (req.body.object === 'whatsapp_business_account') {
      const entries = req.body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === 'messages' && change.value?.messages) {
            const phoneNumberId = change.value.metadata?.phone_number_id;
            const from = change.value.contacts?.[0]?.wa_id;

            if (!phoneNumberId || !from) {
              logger.error(
                'Missing phone_number_id or wa_id in webhook payload'
              );
              res
                .status(400)
                .json({ error: 'Missing phone_number_id or wa_id' });
              return;
            }

            try {
              await processWebhookMessage(change.value, phoneNumberId, from);
            } catch (error: unknown) {
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
              logger.error('Error processing webhook message', {
                error: errorMessage,
              });
              res.status(500).json({ error: 'Failed to process message' });
              return;
            }
          }
        }
      }
      res.status(200).end();
    } else {
      logger.warn('Invalid webhook payload');
      res.status(400).json({ error: 'Invalid webhook payload' });
    }
  }
);

/**
 * Health check endpoint.
 */
router.get('/health', (_req, res) => {
  logger.info('Health check endpoint hit');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

export default router;
