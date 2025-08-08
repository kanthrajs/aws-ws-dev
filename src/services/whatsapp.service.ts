// src/services/whatsapp.service.ts
import axios from 'axios';
import { getEnvConfig } from '../config/env.js';
import {
  type WhatsAppMessageContent,
  type WhatsAppApiResponse,
} from '../interfaces/whatsapp.js';
import logger from '../logger.js';

const { whatsappToken } = getEnvConfig();

/**
 * Sends a WhatsApp message using the Cloud API.
 * @param phoneNumberId - WhatsApp phone number ID.
 * @param to - Recipient phone number (wa_id).
 * @param messageType - Message type (e.g., 'text', 'interactive').
 * @param content - Message content payload.
 * @returns {Promise<any>} API response.
 */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  messageType: string,
  content: WhatsAppMessageContent
): Promise<WhatsAppApiResponse> {
  try {
    const whatsappApiUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: messageType,
      [messageType]: content,
    };

    const response = await axios.post(whatsappApiUrl, payload, {
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info(`Message sent to ${to}`, { response: response.data });
    return response.data;
  } catch (error) {
    logger.error('Error sending WhatsApp message', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
