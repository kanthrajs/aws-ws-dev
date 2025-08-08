// Import required modules
const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios'); // For sending messages

// Load configuration from .env file
dotenv.config();

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and environment variables
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const whatsappToken = process.env.WHATSAPP_TOKEN; // WhatsApp Access Token

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

    console.log(`Message sent successfully: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
}

// Route for handling incoming messages (POST)
app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));

  // Verify webhook payload
  if (req.body.object === 'whatsapp_business_account') {
    const entries = req.body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'messages' && change.value?.messages) {
          // Extract PHONE_NUMBER_ID from the payload
          const phoneNumberId = change.value.metadata?.phone_number_id;
          if (!phoneNumberId) {
            console.error('PHONE_NUMBER_ID not found in webhook payload');
            res.status(400).json({ error: 'Missing phone_number_id' });
            return;
          }

          const messages = change.value.messages;
          const from = change.value.contacts?.[0]?.wa_id;

          for (const message of messages) {
            if (message.type === 'text' && message.text?.body) {
              console.log(`Received text message from ${from} on phone_number_id ${phoneNumberId}: ${message.text.body}`);

              // Respond with a simple echo text message
              const responseText = {
                body: `Echo: ${message.text.body}`,
              };
              await sendWhatsAppMessage(phoneNumberId, from, 'text', responseText);
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