// src/index.ts
import express, { type Request, type Response, type NextFunction } from 'express';
import dotenv from 'dotenv';
import axios, { type AxiosResponse } from 'axios';

// Load configuration from .env file
dotenv.config();

// Create an Express app
const app: express.Application = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Environment variables with type annotations
const port: number = parseInt(process.env.PORT || '3000', 10);
const verifyToken: string | undefined = process.env.VERIFY_TOKEN;
const whatsappToken: string | undefined = process.env.WHATSAPP_TOKEN;
const goldApiToken: string = process.env.GOLD_API_TOKEN || 'goldapi-ddiypqf-io';

// Interfaces for WhatsApp webhook payload (simplified)
interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    changes: Array<{
      field: string;
      value: {
        metadata?: { phone_number_id: string };
        messages?: Array<{
          type: string;
          text?: { body: string };
          interactive?: {
            list_reply?: { title: string };
            button_reply?: { id: string };
          };
          from?: string;
        }>;
        contacts?: Array<{ wa_id: string }>;
      };
    }>;
  }>;
}

// Interface for GoldAPI response
interface GoldApiResponse {
  price: number;
}

// Interface for user state
interface UserState {
  step: string;
  product?: string;
  quantity?: number;
}

// Finite State Automaton states
const STATES = {
  IDLE: 'IDLE',
  WELCOME_SENT: 'WELCOME_SENT',
  SELECT_PRODUCT: 'SELECT_PRODUCT',
  ENTER_QUANTITY: 'ENTER_QUANTITY',
  CONFIRM_ORDER: 'CONFIRM_ORDER',
} as const;

// In-memory storage for order state and gold rate (use database in production)
const orderState: Map<string, UserState> = new Map();
let goldRate: number | null = null; // Cache gold rate (in USD per ounce)

// Function to fetch gold rate from GoldAPI
async function fetchGoldRate(): Promise<number | null> {
  try {
    const response: AxiosResponse<GoldApiResponse> = await axios.get('https://www.goldapi.io/api/XAU/USD', {
      headers: { 'x-access-token': goldApiToken },
    });
    goldRate = response.data.price;
    console.log(`Fetched gold rate: $${goldRate}/oz`);
    return goldRate;
  } catch (error: any) {
    console.error('Error fetching gold rate:', error.response?.data || error.message);
    return null;
  }
}

// Function to send a WhatsApp message
async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  messageType: string,
  content: any,
): Promise<any> {
  try {
    const whatsappApiUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: messageType,
      [messageType]: content,
    };

    const response: AxiosResponse = await axios.post(whatsappApiUrl, payload, {
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Message sent to ${to}: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
}

// Route for webhook verification (GET)
app.get('/', (req: Request, res: Response) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for handling incoming messages (POST)
app.post('/', async (req: Request<{}, {}, WhatsAppWebhookPayload>, res: Response) => {
  const timestamp: string = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));

  if (req.body.object === 'whatsapp_business_account') {
    const entries = req.body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'messages' && change.value?.messages) {
          // Extract PHONE_NUMBER_ID
          const phoneNumberId: string | undefined = change.value.metadata?.phone_number_id;
          if (!phoneNumberId) {
            console.error('PHONE_NUMBER_ID not found in webhook payload');
            res.status(400).json({ error: 'Missing phone_number_id' });
            return;
          }

          const messages = change.value.messages;
          const from: string | undefined = change.value.contacts?.[0]?.wa_id;
          if (!from) {
            console.error('Sender wa_id not found');
            res.status(400).json({ error: 'Missing sender wa_id' });
            return;
          }

          const userState: UserState = orderState.get(from) || { step: STATES.IDLE };

          for (const message of messages) {
            // Handle text messages
            if (message.type === 'text' && message.text?.body) {
              const text: string = message.text.body.toLowerCase();

              switch (userState.step) {
                case STATES.IDLE:
                  if (text === 'hi') {
                    const rate: number | null = await fetchGoldRate();
                    const welcomeText: string = rate
                      ? `Welcome! Today's gold rate is $${rate} per ounce. Type 'order' to place an order.`
                      : `Welcome! Unable to fetch gold rate. Type 'order' to place an order.`;
                    await sendWhatsAppMessage(phoneNumberId, from, 'text', { body: welcomeText });
                    orderState.set(from, { step: STATES.WELCOME_SENT });
                  } else if (text === 'order') {
                    const productList = {
                      type: 'list',
                      header: { type: 'text', text: 'Select a Product' },
                      body: { text: 'Choose a product to order:' },
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
                    orderState.set(from, { step: STATES.SELECT_PRODUCT });
                    await sendWhatsAppMessage(phoneNumberId, from, 'interactive', productList);
                  } else {
                    await sendWhatsAppMessage(phoneNumberId, from, 'text', {
                      body: "Type 'hi' for a welcome message or 'order' to start an order.",
                    });
                  }
                  break;

                case STATES.WELCOME_SENT:
                  if (text === 'order') {
                    const productList = {
                      type: 'list',
                      header: { type: 'text', text: 'Select a Product' },
                      body: { text: 'Choose a product to order:' },
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
                    orderState.set(from, { step: STATES.SELECT_PRODUCT });
                    await sendWhatsAppMessage(phoneNumberId, from, 'interactive', productList);
                  } else if (text === 'hi') {
                    const rate: number | null = await fetchGoldRate();
                    const welcomeText: string = rate
                      ? `Welcome! Today's gold rate is $${rate} per ounce. Type 'order' to place an order.`
                      : `Welcome! Unable to fetch gold rate. Type 'order' to place an order.`;
                    await sendWhatsAppMessage(phoneNumberId, from, 'text', { body: welcomeText });
                  } else {
                    await sendWhatsAppMessage(phoneNumberId, from, 'text', {
                      body: "Type 'order' to start an order.",
                    });
                  }
                  break;

                case STATES.ENTER_QUANTITY:
                  if (/^\d+$/.test(text)) {
                    const quantity: number = parseInt(text);
                    const productWeights: { [key: string]: number } = { Phone: 0.01, Laptop: 0.02, Tablet: 0.005 };
                    const weight: number = productWeights[userState.product!] || 0.01;
                    const totalCost: string = goldRate ? (quantity * weight * goldRate).toFixed(2) : 'N/A';
                    orderState.set(from, { ...userState, quantity, step: STATES.CONFIRM_ORDER });

                    const confirmation = {
                      type: 'button',
                      header: { type: 'text', text: 'Order Confirmation' },
                      body: {
                        text: `Order Summary:\nProduct: ${userState.product}\nQuantity: ${quantity}\nGold Rate: $${
                          goldRate || 'N/A'
                        }/oz\nTotal Cost: $${totalCost}\nConfirm?`,
                      },
                      action: {
                        buttons: [
                          { type: 'reply', reply: { id: 'confirm', title: 'Confirm' } },
                          { type: 'reply', reply: { id: 'cancel', title: 'Cancel' } },
                        ],
                      },
                    };
                    await sendWhatsAppMessage(phoneNumberId, from, 'interactive', confirmation);
                  } else {
                    await sendWhatsAppMessage(phoneNumberId, from, 'text', {
                      body: `Please enter a valid number for ${userState.product} quantity.`,
                    });
                  }
                  break;

                case STATES.SELECT_PRODUCT:
                case STATES.CONFIRM_ORDER:
                  await sendWhatsAppMessage(phoneNumberId, from, 'text', {
                    body:
                      userState.step === STATES.SELECT_PRODUCT
                        ? 'Please select a product from the list.'
                        : 'Please confirm or cancel using the buttons.',
                  });
                  break;
              }
            }
            // Handle interactive messages
            else if (message.type === 'interactive' && message.interactive?.list_reply) {
              if (userState.step === STATES.SELECT_PRODUCT) {
                const product: string = message.interactive.list_reply.title;
                orderState.set(from, { step: STATES.ENTER_QUANTITY, product });
                await sendWhatsAppMessage(phoneNumberId, from, 'text', {
                  body: `Please enter the quantity for ${product}`,
                });
              }
            } else if (message.type === 'interactive' && message.interactive?.button_reply) {
              if (userState.step === STATES.CONFIRM_ORDER) {
                const reply: string = message.interactive.button_reply.id;
                if (reply === 'confirm') {
                  const orderId: string = Math.random().toString(36).substr(2, 8).toUpperCase();
                  await sendWhatsAppMessage(phoneNumberId, from, 'text', {
                    body: `Order confirmed! Order ID: ${orderId}. Type 'order' to start a new order or 'hi' for the welcome message.`,
                  });
                  orderState.delete(from); // Reset to IDLE
                } else if (reply === 'cancel') {
                  await sendWhatsAppMessage(phoneNumberId, from, 'text', {
                    body: `Order cancelled. Type 'order' to start a new order or 'hi' for the welcome message.`,
                  });
                  orderState.delete(from); // Reset to IDLE
                }
              }
            }
          }
        }
      }
    }
    res.status(200).end();
  } else {
    res.status(400).json({ error: 'Invalid webhook payload' });
  }
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  console.log('Health check endpoint hit');
  res.json({
    status: 'healthy-successful',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});