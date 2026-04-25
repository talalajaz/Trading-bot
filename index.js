const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const TO_NUMBER = process.env.TO_NUMBER;

async function sendWhatsApp(message) {
  await axios.post(
    `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: TO_NUMBER,
      type: 'text',
      text: { body: message }
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
}

// TradingView webhook hits this endpoint
app.post('/webhook', async (req, res) => {
  const data = req.body;
  console.log('Signal received:', data);

  const message = `
🚨 TRADE SIGNAL
Pair: ${data.pair || 'N/A'}
Direction: ${data.direction || 'N/A'}
Entry: ${data.entry || 'N/A'}
Stop Loss: ${data.sl || 'N/A'}
TP1: ${data.tp1 || 'N/A'}
TP2: ${data.tp2 || 'N/A'}
RR: ${data.rr || 'N/A'}
Confidence: ${data.confidence || 'N/A'}
Reason: ${data.reason || 'N/A'}
  `;

  try {
    await sendWhatsApp(message);
    res.json({ status: 'sent' });
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to send' });
  }
});

app.get('/', (req, res) => res.send('Trading Bot is running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
