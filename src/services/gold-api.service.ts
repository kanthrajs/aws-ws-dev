// src/services/gold-api.service.ts
import axios from 'axios';
import { type GoldApiResponse } from '../interfaces/gold-api.js';
import { getEnvConfig } from '../config/env.js';
import logger from '../logger.js';

const { goldApiToken } = getEnvConfig();
let goldRate: number | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms

/**
 * Fetches the current gold rate from GoldAPI, with caching.
 * @returns {Promise<number | null>} Gold rate in USD per ounce or null if failed.
 * @throws {Error} If the API request fails.
 */
export async function fetchGoldRate(): Promise<number | null> {
  let goldRateTimestamp = Date.now();
  // Return cached rate if valid
  if (goldRate !== null && Date.now() < goldRateTimestamp + CACHE_DURATION) {
    logger.info(`Using cached gold rate: $${goldRate}/oz`);
    return goldRate;
  }

  try {
    const response = await axios.get<GoldApiResponse>(
      'https://www.goldapi.io/api/XAU/INR',
      {
        headers: { 'x-access-token': goldApiToken },
      }
    );
    goldRate = response.data.price;
    goldRateTimestamp = Date.now();
    logger.info(`Fetched gold rate: INR ${goldRate}/oz`);
    return goldRate;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching gold rate', { error: errorMessage });
    return null;
  }
}
