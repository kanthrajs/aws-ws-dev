// src/state/state-manager.ts
import {
  type UserState,
  STATES,
} from '../interfaces/user-state.js';
import { type WhatsAppWebhookPayload } from '../interfaces/whatsapp.js';
import { sendWhatsAppMessage } from '../services/whatsapp.service.js';
import { fetchGoldRate } from '../services/gold-api.service.js';
import { getMainMenu, getLanguageMenu, getCreateOrderMenu } from '../utils/menu-options.js';
import type { Language } from '../utils/menu-options.js';

// In-memory state storage (use Redis or database in production)
const orderState: Map<string, UserState> = new Map();
const productWeights: { [key: string]: number } = {
  necklace: 120,
  bangles: 50,
  earings: 20,
};

/**
 * Processes incoming WhatsApp webhook messages and manages state transitions.
 */
export async function processWebhookMessage(
  payload: WhatsAppWebhookPayload['entry'][0]['changes'][0]['value'],
  phoneNumberId: string,
  from: string
): Promise<void> {
  const messages = payload.messages || [];
  const userState: UserState = orderState.get(from) || { step: STATES.IDLE, language: 'english' };

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
        message.interactive.list_reply.id, // Use id instead of title
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
 * Sends the main menu.
 */
async function sendMainMenu(phoneNumberId: string, to: string, language: Language = 'english'): Promise<void> {
  const mainMenu = getMainMenu(language);
  await sendWhatsAppMessage(phoneNumberId, to, 'interactive', mainMenu);
}

/**
 * Sends the create order menu.
 */
async function sendCreateOrderMenu(phoneNumberId: string, to: string, language: Language = 'english'): Promise<void> {
  const createOrderMenu = getCreateOrderMenu(language);
  await sendWhatsAppMessage(phoneNumberId, to,'interactive', createOrderMenu);
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
  const language = userState.language || 'english';

  switch (userState.step) {
    case STATES.IDLE:
      if (normalizedText === 'hi') {
        const rate = await fetchGoldRate();
        const ratePerGram = rate ? (rate / 31.1).toFixed(2) : rate;
        const welcomeText = rate
          ? `Welcome to Sree Lakshmi Jewellers Whatsapp store! 🌟 Today's gold rate is INR ${ratePerGram} per gram. Type 'menu' to see options or 'order' to start shopping.`
          : `Welcome to Sree Lakshmi Jewellers Whatsapp store! 🌟 Unable to fetch gold rate. Type 'menu' to see options or 'order' to start shopping.`;
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: welcomeText,
        });
        orderState.set(from, { step: STATES.WELCOME_SENT, language });
      } else if (normalizedText === 'order') {
        await sendCreateOrderMenu(phoneNumberId, from, language);
        orderState.set(from, { step: STATES.CREATE_ORDER, language });
      } else if (normalizedText === 'menu') {
        await sendMainMenu(phoneNumberId, from, language);
        orderState.set(from, { step: STATES.MAIN_MENU, language });
      } else {
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: "Hi there! Type 'hi' for a welcome message, 'order' to start shopping, or 'menu' for more options. 😊",
        });
      }
      break;

    case STATES.WELCOME_SENT:
      if (normalizedText === 'order') {
        await sendCreateOrderMenu(phoneNumberId, from, language);
        orderState.set(from, { step: STATES.CREATE_ORDER, language });
      } else if (normalizedText === 'menu') {
        await sendMainMenu(phoneNumberId, from, language);
        orderState.set(from, { step: STATES.MAIN_MENU, language });
      } else if (normalizedText === 'hi') {
        const rate = await fetchGoldRate();
        const ratePerGram = rate ? (rate / 31.1).toFixed(2) : rate;
        const welcomeText = rate
          ? `Welcome back! 🌟 Today's gold rate is INR ${ratePerGram} per gram. Type 'menu' or 'order' to proceed.`
          : `Welcome back! 🌟 Unable to fetch gold rate. Type 'menu' or 'order' to proceed.`;
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: welcomeText,
        });
      } else {
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: "Ready to shop or explore? Type 'order' to browse products or 'menu' for more options. 😊",
        });
      }
      break;

    case STATES.CREATE_ORDER:
      if (normalizedText === 'order') {
        await sendCreateOrderMenu(phoneNumberId, from, language);
      } else if (normalizedText === 'menu') {
        await sendMainMenu(phoneNumberId, from, language);
        orderState.set(from, { step: STATES.MAIN_MENU, language });
      } else if (normalizedText === 'hi') {
        const rate = await fetchGoldRate();
        const ratePerGram = rate ? (rate / 31.1).toFixed(2) : rate;
        const welcomeText = rate
          ? `Welcome back! 🌟 Today's gold rate is INR ${ratePerGram} per gram. Type 'menu' or 'order' to proceed.`
          : `Welcome back! 🌟 Unable to fetch gold rate. Type 'menu' or 'order' to proceed.`;
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: welcomeText,
        });
        orderState.set(from, { step: STATES.WELCOME_SENT, language });
      } else {
        await sendCreateOrderMenu(phoneNumberId, from, language);
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: 'Please select an option from the Create Order menu. 📋',
        });
      }
      break;

    case STATES.ENTER_QUANTITY:
      if (/^\d+$/.test(normalizedText)) {
        const quantity = parseInt(normalizedText);
        const weight = productWeights[userState.product!] || 0.01;
        const rate = await fetchGoldRate();
        const ratePerGram = rate ? (rate / 31.1).toFixed(2) : rate;
        const totalCost = ratePerGram ? (quantity * weight * Number(ratePerGram)).toFixed(2) : rate;
        const confirmation = {
          type: 'button',
          header: { type: 'text', text: 'Order Confirmation' },
          body: {
            text: `📋 Order Summary:\n- Product: ${userState.product}\n- Quantity: ${quantity}\n- Gold Rate: INR ${ratePerGram || 'N/A'}/gram\n- Total Cost: INR ${totalCost}\nPlease confirm your order.`,
          },
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

    case STATES.MAIN_MENU:
      if (normalizedText === 'order') {
        await sendCreateOrderMenu(phoneNumberId, from, language);
        orderState.set(from, { step: STATES.CREATE_ORDER, language });
      } else if (normalizedText === 'menu') {
        await sendMainMenu(phoneNumberId, from, language);
      } else if (normalizedText === 'hi') {
        const rate = await fetchGoldRate();
        const ratePerGram = rate ? (rate / 31.1).toFixed(2) : rate;
        const welcomeText = rate
          ? `Welcome back! 🌟 Today's gold rate is INR ${ratePerGram} per gram. Type 'menu' or 'order' to proceed.`
          : `Welcome back! 🌟 Unable to fetch gold rate. Type 'menu' or 'order' to proceed.`;
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: welcomeText,
        });
        orderState.set(from, { step: STATES.WELCOME_SENT, language });
      } else {
        await sendMainMenu(phoneNumberId, from, language);
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: 'Please select an option from the menu. 📋',
        });
      }
      break;

    case STATES.CHANGE_LANGUAGE:
      await sendWhatsAppMessage(phoneNumberId, from, 'text', {
        body: 'Please select a language from the list provided. 🌐',
      });
      break;
  }
}

/**
 * Handles interactive list replies (menu selections, product selection, or language selection).
 */
async function handleListReply(
  id: string, // Use id for selections
  userState: UserState,
  phoneNumberId: string,
  from: string
): Promise<void> {
  const language = userState.language || 'english';

  if (userState.step === STATES.MAIN_MENU) {
    switch (id) {
      case 'view_points':
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: 'You have 100 loyalty points. 🎉',
        });
        await sendMainMenu(phoneNumberId, from, language);
        orderState.set(from, { step: STATES.MAIN_MENU, language });
        break;
      case 'view_orders':
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: 'You have no recent orders. 📦',
        });
        await sendMainMenu(phoneNumberId, from, language);
        orderState.set(from, { step: STATES.MAIN_MENU, language });
        break;
      case 'contact_support':
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: 'Contact us at ragu395@gamil.com or call +91-94482-61555. 📞',
        });
        await sendMainMenu(phoneNumberId, from, language);
        orderState.set(from, { step: STATES.MAIN_MENU, language });
        break;
      case 'change_language':
        await sendWhatsAppMessage(phoneNumberId, from, 'interactive', getLanguageMenu());
        orderState.set(from, { step: STATES.CHANGE_LANGUAGE, language });
        break;
      case 'create_order':
        await sendCreateOrderMenu(phoneNumberId, from, language);
        orderState.set(from, { step: STATES.CREATE_ORDER, language });
        break;
      default:
        await sendMainMenu(phoneNumberId, from, language);
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: 'Please select a valid option from the menu. 📋',
        });
    }
  } else if (userState.step === STATES.CREATE_ORDER) {
    switch (id) {
      case 'browse_products':
        await sendProductList(phoneNumberId, from);
        orderState.set(from, { step: STATES.SELECT_PRODUCT, language });
        break;
      case 'back_to_main':
        await sendMainMenu(phoneNumberId, from, language);
        orderState.set(from, { step: STATES.MAIN_MENU, language });
        break;
      default:
        await sendCreateOrderMenu(phoneNumberId, from, language);
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: 'Please select a valid option from the Create Order menu. 📋',
        });
    }
  } else if (userState.step === STATES.SELECT_PRODUCT) {
    orderState.set(from, { step: STATES.ENTER_QUANTITY, product: id, language });
    await sendWhatsAppMessage(phoneNumberId, from, 'text', {
      body: `Great choice! Please enter the quantity for ${id} (e.g., 2).`,
    });
  } else if (userState.step === STATES.CHANGE_LANGUAGE) {
    let newLanguage: Language = 'english';
    switch (id) {
      case 'lang_english':
        newLanguage = 'english';
        break;
      case 'lang_kannada':
        newLanguage = 'kannada';
        break;
      case 'lang_tamil':
        newLanguage = 'tamil';
        break;
      case 'lang_telugu':
        newLanguage = 'telugu';
        break;
      default:
        await sendWhatsAppMessage(phoneNumberId, from, 'text', {
          body: 'Invalid language selection. Please choose a language from the list. 🌐',
        });
        await sendWhatsAppMessage(phoneNumberId, from, 'interactive', getLanguageMenu());
        return;
    }
    await sendWhatsAppMessage(phoneNumberId, from, 'text', {
      body: `Language changed to ${newLanguage}! 🌐`,
    });
    await sendMainMenu(phoneNumberId, from, newLanguage);
    orderState.set(from, { step: STATES.MAIN_MENU, language: newLanguage });
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
  const language = userState.language || 'english';

  if (userState.step === STATES.CONFIRM_ORDER) {
    if (replyId === 'confirm') {
      const orderId = Math.random().toString(36).substr(2, 8).toUpperCase();
      await sendWhatsAppMessage(phoneNumberId, from, 'text', {
        body: `🎉 Order confirmed! Order ID: ${orderId}.`,
      });
      await sendMainMenu(phoneNumberId, from, language);
      orderState.set(from, { step: STATES.MAIN_MENU, language });
    } else if (replyId === 'cancel') {
      await sendWhatsAppMessage(phoneNumberId, from, 'text', {
        body: `Order cancelled. 😔`,
      });
      await sendMainMenu(phoneNumberId, from, language);
      orderState.set(from, { step: STATES.MAIN_MENU, language });
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
    body: { text: 'Browse our products and choose one to order:' },
    action: {
      button: 'Choose Product',
      sections: [
        {
          title: 'Products',
          rows: [
            { id: 'necklace', title: 'Necklace', description: 'INR 50000' },
            { id: 'bangles', title: 'Bangles', description: 'INR 10000' },
            { id: 'earings', title: 'Earrings', description: 'INR 30000' }, // Fixed typo in 'earings'
          ],
        },
      ],
    },
  };
  await sendWhatsAppMessage(phoneNumberId, to, 'interactive', productList);
}