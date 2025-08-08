// src/interfaces/user-state.ts
export const STATES = {
  IDLE: 'IDLE',
  WELCOME_SENT: 'WELCOME_SENT',
  SELECT_PRODUCT: 'SELECT_PRODUCT',
  ENTER_QUANTITY: 'ENTER_QUANTITY',
  CONFIRM_ORDER: 'CONFIRM_ORDER',
  MAIN_MENU: 'MAIN_MENU', // New state
  CHANGE_LANGUAGE: 'CHANGE_LANGUAGE', // New state for language selection
} as const;

export type StateType = (typeof STATES)[keyof typeof STATES];

// Import Language type from menu-options.ts
import { type Language } from '../utils/menu-options.js';

export interface UserState {
  step: StateType;
  product?: string;
  quantity?: number;
  language?: Language; // Add language field, default to 'english'
}
