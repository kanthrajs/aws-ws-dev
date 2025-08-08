// src/config/env.ts
import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  port: number;
  verifyToken: string;
  whatsappToken: string;
  goldApiToken: string;
}

/**
 * Validates and retrieves environment variables.
 * @throws {Error} If required environment variables are missing.
 */
export function getEnvConfig(): EnvConfig {
  const port = parseInt(process.env.PORT || '3000', 10);
  const verifyToken = process.env.VERIFY_TOKEN;
  const whatsappToken = process.env.WHATSAPP_TOKEN;
  const goldApiToken = process.env.GOLD_API_TOKEN || 'goldapi-ddiypqf-io';

  if (!verifyToken || !whatsappToken) {
    throw new Error(
      'Missing required environment variables: VERIFY_TOKEN or WHATSAPP_TOKEN'
    );
  }

  return {
    port,
    verifyToken,
    whatsappToken,
    goldApiToken,
  };
}
