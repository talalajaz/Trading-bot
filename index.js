const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const TO_NUMBER = process.env.TO_NUMBER;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const VERIFY_TOKEN = 'tradingbot123';

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

async function askClaude(userMessage) {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are an expert ICT trading analyst. When asked to scan markets or analyze a pair, provide a concise signal in this format:
      
🚨 SIGNAL FOUND (or ❌ NO SIGNAL)
Pair: 
Direction: BUY/SELL
Entry: 
Stop Loss: 
TP1: 
TP2: 
RR: 
Confidence: /100
Reason: (2 lines max)

Keep responses short and suitable for WhatsApp. If no signal, explain briefly why.`,
      messages: [
        { role: 'user', content: userMessage }
      ]
    },
    {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.content[0].text;
}

// Webhook verification for Meta
app.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Receive incoming WhatsApp messages
app.post('/whatsapp', async (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (message && message.type === 'text') {
      const userText = message.text.body;
      console.log('Message received:', userText);
      try {
        const claudeReply = await askClaude(userText);
        await sendWhatsApp(claudeReply);
      } catch (err) {
        console.error('Error:', err.response?.data || err.message);
        await sendWhatsApp('Sorry, error processing your request. Try again.');
      }
    }
  }
  res.sendStatus(200);
});

// Manual signal trigger
app.post('/webhook', async (req, res) => {
  const data = req.body;
  const message = `🚨 TRADE SIGNAL
Pair: ${data.pair || 'N/A'}
Direction: ${data.direction || 'N/A'}
Entry: ${data.entry || 'N/A'}
Stop Loss: ${data.sl || 'N/A'}
TP1: ${data.tp1 || 'N/A'}
TP2: ${data.tp2 || 'N/A'}
RR: ${data.rr || 'N/A'}
Confidence: ${data.confidence || 'N/A'}
Reason: ${data.reason || 'N/A'}`;

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
