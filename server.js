import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(express.json());

const META_TOKEN = process.env.META_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

// ✅ Verify webhook (for Meta)
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "YURII_TOKEN"; // Use this in your Meta setup
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 💬 Handle incoming WhatsApp messages
app.post("/webhook", async (req, res) => {
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const text = msg?.text?.body;
  const from = msg?.from;
  if (!text) return res.sendStatus(200);

  console.log("💬 Message received:", text);

  try {
    // Send message to OpenAI
    const ai = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: text }],
    });

    const reply = ai.choices[0].message.content;

    // Send AI reply back to WhatsApp
    await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${META_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: { body: reply },
      }),
    });

    console.log("✅ Reply sent!");
  } catch (err) {
    console.error("❌ Error:", err);
  }

  res.sendStatus(200);
});

app.listen(3000, () => console.log("🚀 WhatsApp AI bot running on port 3000"));