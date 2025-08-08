// src/interfaces/user-state.ts
export const STATES = {
  IDLE: 'IDLE',
  WELCOME_SENT: 'WELCOME_SENT',
  SELECT_PRODUCT: 'SELECT_PRODUCT',
  ENTER_QUANTITY: 'ENTER_QUANTITY',
  CONFIRM_ORDER: 'CONFIRM_ORDER',
} as const;

export type StateType = (typeof STATES)[keyof typeof STATES];

export interface UserState {
  step: StateType;
  product?: string;
  quantity?: number;
}
