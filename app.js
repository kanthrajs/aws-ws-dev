// Import required modules
const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');

// Load configuration from .env file
dotenv.config();

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and environment variables
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const whatsappToken = process.env.WHATSAPP_TOKEN;
const goldApiToken = process.env.GOLD_API_TOKEN; // GoldAPI token

// In-memory storage for order state and gold rate (use database in production)
const orderState = new Map(); // Tracks user order progress: { wa_id: { step, product, quantity } }
let goldRate = null; // Cache gold rate (in USD per ounce)

// Function to fetch gold rate from GoldAPI
async function fetchGoldRate() {
  try {
    const response = await axios.get('https://www.goldapi.io/api/XAU/USD', {
      headers: { 'x-access-token': goldApiToken },
    });
    goldRate = response.data.price; // Price in USD per ounce
    console.log(`Fetched gold rate: $${goldRate}/oz`);
    return goldRate;
  } catch (error) {
    console.error('Error fetching gold rate:', error.response?.data || error.message);
    return null; // Fallback to null if API fails
  }
}

// Function to send a WhatsApp message
async function sendWhatsAppMessage(phoneNumberId, to, messageType, content) {
  try {
    const whatsappApiUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: messageType,
      [messageType]: content,
    };

    const response = await axios.post(whatsappApiUrl, payload, {
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Message sent to ${to}: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
}

// Route for webhook verification (GET)
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for handling incoming messages (POST)
app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));

  if (req.body.object === 'whatsapp_business_account') {
    const entries = req.body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'messages' && change.value?.messages) {
          // Extract PHONE_NUMBER_ID
          const phoneNumberId = change.value.metadata?.phone_number_id;
          if (!phoneNumberId) {
            console.error('PHONE_NUMBER_ID not found in webhook payload');
            res.status(400).json({ error: 'Missing phone_number_id' });
            return;
          }

          const messages = change.value.messages;
          const from = change.value.contacts?.[0]?.wa_id;

          for (const message of messages) {
            // Handle text messages
            if (message.type === 'text' && message.text?.body) {
              const text = message.text.body.toLowerCase();
              const userState = orderState.get(from) || { step: 'idle' };

              if (text === 'hi' && userState.step === 'idle') {
                // Fetch gold rate and send welcome message
                const rate = await fetchGoldRate();
                const welcomeText = rate
                  ? `Welcome! Today's gold rate is $${rate} per ounce. Type 'order' to place an order.`
                  : `Welcome! Unable to fetch gold rate at the moment. Type 'order' to place an order.`;
                await sendWhatsAppMessage(phoneNumberId, from, 'text', { body: welcomeText });
              } else if (text === 'order' && userState.step === 'idle') {
                // Start order flow: Send product selection list
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
                          { id: 'necklace', title: 'necklace', description: ' INR 50000' },
                          { id: 'bangles', title: 'bangles', description: 'INR 10000' },
                          { id: 'earings', title: 'earings', description: ' INR 30000' },
                        ],
                      },
                    ],
                  },
                };
                orderState.set(from, { step: 'select_product' });
                await sendWhatsAppMessage(phoneNumberId, from, 'interactive', productList);
              } else if (userState.step === 'enter_quantity' && /^\d+$/.test(text)) {
                // Handle quantity input
                const quantity = parseInt(text);
                const productWeights = { Phone: 0.01, Laptop: 0.02, Tablet: 0.005 }; // oz of gold
                const weight = productWeights[userState.product] || 0.01;
                const totalCost = goldRate ? (quantity * weight * goldRate).toFixed(2) : 'N/A';
                orderState.set(from, { ...userState, quantity, step: 'confirm_order' });

                // Send confirmation with detailed summary
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
                // Default echo response
                const responseText = { body: `Echo: ${message.text.body}` };
                await sendWhatsAppMessage(phoneNumberId, from, 'text', responseText);
              }
            }
            // Handle interactive messages (product selection or confirmation)
            else if (message.type === 'interactive' && message.interactive?.list_reply) {
              const userState = orderState.get(from) || { step: 'idle' };
              if (userState.step === 'select_product') {
                const product = message.interactive.list_reply.title;
                orderState.set(from, { step: 'enter_quantity', product });
                const responseText = { body: `Please enter the quantity for ${product}` };
                await sendWhatsAppMessage(phoneNumberId, from, 'text', responseText);
              }
            } else if (message.type === 'interactive' && message.interactive?.button_reply) {
              const userState = orderState.get(from) || { step: 'idle' };
              if (userState.step === 'confirm_order') {
                const reply = message.interactive.button_reply.id;
                if (reply === 'confirm') {
                  const orderId = Math.random().toString(36).substr(2, 8).toUpperCase();
                  const responseText = { body: `Order confirmed! Order ID: ${orderId}` };
                  await sendWhatsAppMessage(phoneNumberId, from, 'text', responseText);
                  orderState.delete(from); // Reset state
                } else if (reply === 'cancel') {
                  const responseText = { body: 'Order cancelled.' };
                  await sendWhatsAppMessage(phoneNumberId, from, 'text', responseText);
                  orderState.delete(from); // Reset state
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
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.json({
    status: 'healthy-successful',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});