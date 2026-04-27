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
          content: `You are an expert ICT trading analyst. When asked to scan markets or analyze a pair, provide a concise signal in this format:

🚨 SIGNAL FOUND (or ❌ NO SIGNAL)
Pair: 
Direction: BUY/SELL
Entry: 
Stop Loss: 
TP1:
