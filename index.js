const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const TO_NUMBER = process.env.TO_NUMBER;
const OPENROUTER_API_KEY = process.env.ANTHROPIC_API_KEY;

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
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: 'You are an expert ICT trading analyst. When asked to scan markets or analyze a pair, provide a concise signal in this format: SIGNAL FOUND (or NO SIGNAL) Pair: Direction: BUY/SELL Entry: Stop Loss: TP1: TP2: RR: Confidence: /100 Reason: (2 lines max). Keep responses short and suitable for WhatsApp. If no signal, explain briefly why.'
        },
        { role: 'user', content: userMessage }
      ]
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.choices[0].message.content;
}

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

app.post('/webhook', async (req, res) => {
  const data = req.body;
  const message = `TRADE SIGNAL\nPair: ${data.pair || 'N/A'}\nDirection: ${data.direction || 'N/A'}\nEntry: ${data.entry || 'N/A'}\nStop Loss: ${data.sl || 'N/A'}\nTP1: ${data.tp1 || 'N/A'}\nTP2: ${data.tp2 || 'N/A'}\nRR: ${data.rr || 'N/A'}\nConfidence: ${data.confidence || 'N/A'}\nReason: ${data.reason || 'N/A'}`;
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
