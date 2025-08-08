// src/state/state-manager.ts
import {
  type UserState,
  STATES,
  //   type StateType,
} from '../interfaces/user-state.js';
import { type WhatsAppWebhookPayload } from '../interfaces/whatsapp.js';
import { sendWhatsAppMessage } from '../services/whatsapp.service.js';
import { fetchGoldRate } from '../services/gold-api.service.js';
// import logger from '../logger.js';

// In-memory state storage (use Redis or database in production)
const orderState: Map<string, UserState> = new Map();
const productWeights: { [key: string]: number } = {
  Phone: 0.01,
  Laptop: 0.02,
  Tablet: 0.005,
};

/**
 * Processes incoming WhatsApp webhook messages and manages state transitions.
 * @param payload - WhatsApp webhook payload.
 * @param phoneNumberId - WhatsApp phone number ID.
 * @param from - Sender's wa_id.
 */
export async function processWebhookMessage(
  payload: WhatsAppWebhookPayload['entry'][0]['changes'][0]['value'],
  phoneNumberId: string,
  from: string
): Promise<void> {
  const messages = payload.messages || [];
  const userState: UserState = orderState.get(from) || { step: STATES.IDLE };

  for (const message of messages) {
    if (message.type === 'text' && message.text?.body) {
      await handleTextMessage(
        message.text.body,
        userState,
        phoneNumberId,
        from
      );
    } else if (
      message.type === 'interactive' &&
      message.interactive?.list_reply
    ) {
      await handleListReply(
        message.interactive.list_reply.title,
        userState,
        phoneNumberId,
        from
      );
    } else if (
      message.type === 'interactive' &&
      message.interactive?.button_reply
    ) {
      await handleButtonReply(
        message.interactive.button_reply.id,
        userState,
        phoneNumberId,
        from
      );
    }
  }
}

/**
 * Handles text messages based on the current state.
 */
async function handleTextMessage(
  text: string,
  userState: UserState,
  phoneNumberId: string,
  from: string
): Promise<void> {
  const normalizedText = text.toLowerCase();

  switch (userState.step) {
    case STATES.IDLE:
      if (normalizedText === 'hi') {
        const rate = await fetchGoldRate();
        const welcomeText = rate
          ? `Welcome to our store! 🌟 Today's gold rate is $${rate} per ounce. Type 'order' to start shopping.`
          : `Welcome to our store! 🌟 Unable to fetch gold rate at the moment. Type 'order' to start shopping.`;
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: welcomeText,
        });
        orderState.set(from, { step: STATES.WELCOME_SENT });
      } else if (normalizedText === 'order') {
        await sendProductList(phoneNumberId, from);
        orderState.set(from, { step: STATES.SELECT_PRODUCT });
      } else {
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: "Hi there! Type 'hi' for a welcome message or 'order' to start shopping. 😊",
        });
      }
      break;

    case STATES.WELCOME_SENT:
      if (normalizedText === 'order') {
        await sendProductList(phoneNumberId, from);
        orderState.set(from, { step: STATES.SELECT_PRODUCT });
      } else if (normalizedText === 'hi') {
        const rate = await fetchGoldRate();
        const welcomeText = rate
          ? `Welcome back! 🌟 Today's gold rate is $${rate} per ounce. Type 'order' to start shopping.`
          : `Welcome back! 🌟 Unable to fetch gold rate. Type 'order' to start shopping.`;
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: welcomeText,
        });
      } else {
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: "Ready to shop? Type 'order' to browse products. 😊",
        });
      }
      break;

    case STATES.ENTER_QUANTITY:
      if (/^\d+$/.test(normalizedText)) {
        const quantity = parseInt(normalizedText);
        const weight = productWeights[userState.product!] || 0.01;
        const rate = await fetchGoldRate();
        const totalCost = rate ? (quantity * weight * rate).toFixed(2) : 'N/A';
        const confirmation = {
          type: 'button',
          header: { type: 'text', text: 'Order Confirmation' },
          body: `📋 Order Summary:\n- Product: ${userState.product}\n- Quantity: ${quantity}\n- Gold Rate: $${
            rate || 'N/A'
          }/oz\n- Total Cost: $${totalCost}\nPlease confirm your order.`,
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'confirm', title: 'Confirm ✅' } },
              { type: 'reply', reply: { id: 'cancel', title: 'Cancel ❌' } },
            ],
          },
        };
        orderState.set(from, {
          ...userState,
          quantity,
          step: STATES.CONFIRM_ORDER,
        });
        await sendWhatsAppMessage(
          phoneNumberId,
          from,
          'interactive',
          confirmation
        );
      } else {
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: `Please enter a valid number for ${userState.product} quantity (e.g., 2).`,
        });
      }
      break;

    case STATES.SELECT_PRODUCT:
    case STATES.CONFIRM_ORDER:
      await sendWhatsAppMessage(phoneNumberId, from, 'text', {
        body:
          userState.step === STATES.SELECT_PRODUCT
            ? 'Please select a product from the list provided. 📋'
            : 'Please use the Confirm or Cancel buttons to proceed. ✅❌',
      });
      break;
  }
}

/**
 * Handles interactive list replies (product selection).
 */
async function handleListReply(
  product: string,
  userState: UserState,
  phoneNumberId: string,
  from: string
): Promise<void> {
  if (userState.step === STATES.SELECT_PRODUCT) {
    orderState.set(from, { step: STATES.ENTER_QUANTITY, product });
    await sendWhatsAppMessage(phoneNumberId, from, 'text', {
      body: `Great choice! Please enter the quantity for ${product} (e.g., 2).`,
    });
  }
}

/**
 * Handles interactive button replies (confirm/cancel).
 */
async function handleButtonReply(
  replyId: string,
  userState: UserState,
  phoneNumberId: string,
  from: string
): Promise<void> {
  if (userState.step === STATES.CONFIRM_ORDER) {
    if (replyId === 'confirm') {
      const orderId = Math.random().toString(36).substr(2, 8).toUpperCase();
      await sendWhatsAppMessage(phoneNumberId, from, 'text', {
        body: `🎉 Order confirmed! Order ID: ${orderId}. Type 'order' to shop again or 'hi' for the welcome message.`,
      });
      orderState.delete(from);
    } else if (replyId === 'cancel') {
      await sendWhatsAppMessage(phoneNumberId, from, 'text', {
        body: `Order cancelled. 😔 Type 'order' to start a new order or 'hi' for the welcome message.`,
      });
      orderState.delete(from);
    }
  }
}

/**
 * Sends the product selection list.
 */
async function sendProductList(
  phoneNumberId: string,
  to: string
): Promise<void> {
  const productList = {
    type: 'list',
    header: { type: 'text', text: 'Select a Product' },
    body: 'Browse our products and choose one to order:',
    action: {
      button: 'Choose Product',
      sections: [
        {
          title: 'Products',
          rows: [
            { id: 'phone', title: 'Phone', description: '0.01 oz of gold' },
            { id: 'laptop', title: 'Laptop', description: '0.02 oz of gold' },
            { id: 'tablet', title: 'Tablet', description: '0.005 oz of gold' },
          ],
        },
      ],
    },
  };
  await sendWhatsAppMessage(phoneNumberId, to, 'interactive', productList);
}
